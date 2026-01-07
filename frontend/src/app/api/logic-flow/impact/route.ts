/**
 * Impact Analysis API - 영향도 분석
 * PRD-0007 v1.4: 바이브 코더를 위한 인과관계 시각화
 *
 * "이 함수 지우면 뭐가 깨져?" 에 대한 답변 제공
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import { analyzeCallGraph } from '@/lib/call-graph-analyzer'
import { analyzeImpactByName } from '@/lib/impact-analyzer'
import { treeCache, GitHubTreeItem } from '@/lib/analysis-cache'
import type { ImpactAnalyzeRequest, ImpactAnalyzeResponse } from '@/lib/types/sequence'

export async function POST(request: NextRequest): Promise<NextResponse<ImpactAnalyzeResponse>> {
  const startTime = Date.now()

  try {
    // 1. 인증 확인
    const authResult = await getGitHubTokenFromSession()
    if (!authResult.token) {
      return NextResponse.json(
        { success: false, error: authResult.error || '인증이 필요합니다. GitHub로 로그인해주세요.' },
        { status: 401 }
      )
    }

    // 2. 요청 파싱
    const body: ImpactAnalyzeRequest = await request.json()
    const { repo, branch = 'main', target, maxDepth = 5 } = body

    if (!repo || !target?.name) {
      return NextResponse.json(
        { success: false, error: 'repo와 target.name이 필요합니다.' },
        { status: 400 }
      )
    }

    // 3. 파일 목록 가져오기 (캐시 활용)
    const cacheKey = `tree:${repo}:${branch}`
    const treeData = treeCache.get(cacheKey)
    let tree: GitHubTreeItem[] = treeData?.tree || []

    if (!treeData) {
      const treeResponse = await fetch(
        `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${authResult.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (!treeResponse.ok) {
        return NextResponse.json(
          { success: false, error: `GitHub API 오류: ${treeResponse.status}` },
          { status: treeResponse.status }
        )
      }

      const responseData = await treeResponse.json()
      tree = responseData.tree || []
      treeCache.set(cacheKey, { tree, truncated: responseData.truncated })
    }

    // 4. TypeScript/JavaScript 파일 필터링
    const codeFiles = tree.filter((item: GitHubTreeItem) =>
      item.type === 'blob' &&
      /\.(ts|tsx|js|jsx)$/.test(item.path) &&
      !item.path.includes('node_modules') &&
      !item.path.includes('.d.ts') &&
      !item.path.includes('.test.') &&
      !item.path.includes('.spec.')
    )

    // 5. 파일 내용 가져오기 (상위 50개만)
    const filesToAnalyze = codeFiles.slice(0, 50)
    const fileContents: Array<{ path: string; content: string }> = []

    // 병렬로 파일 내용 가져오기
    const fetchPromises = filesToAnalyze.map(async (file: GitHubTreeItem) => {
      try {
        const contentResponse = await fetch(
          `https://api.github.com/repos/${repo}/contents/${file.path}?ref=${branch}`,
          {
            headers: {
              Authorization: `Bearer ${authResult.token}`,
              Accept: 'application/vnd.github.v3.raw',
            },
          }
        )

        if (contentResponse.ok) {
          const content = await contentResponse.text()
          return { path: file.path, content }
        }
      } catch {
        // 파일 읽기 실패 시 건너뜀
      }
      return null
    })

    const results = await Promise.all(fetchPromises)
    for (const result of results) {
      if (result) {
        fileContents.push(result)
      }
    }

    // 6. 호출 그래프 분석
    const callGraph = analyzeCallGraph(fileContents)

    // 7. 영향도 분석
    const impactResult = analyzeImpactByName(
      callGraph,
      target.name,
      target.file,
      maxDepth
    )

    if (!impactResult) {
      return NextResponse.json(
        { success: false, error: `함수를 찾을 수 없습니다: ${target.name}` },
        { status: 404 }
      )
    }

    const analysisTimeMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      result: impactResult,
      analysisTimeMs,
    })
  } catch (error) {
    console.error('Impact analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
