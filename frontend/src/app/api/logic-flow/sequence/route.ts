/**
 * Sequence Analysis API - 시퀀스 다이어그램 생성
 * PRD-0007 v1.4: 바이브 코더를 위한 인과관계 시각화
 *
 * 사용자 행동 → 시스템 반응을 시퀀스 다이어그램으로 표현
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import { analyzeCallGraph } from '@/lib/call-graph-analyzer'
import {
  generateSequenceFlow,
  generateSequenceFromHandler,
  generateMermaidSequence,
} from '@/lib/sequence-analyzer'
import { treeCache, GitHubTreeItem } from '@/lib/analysis-cache'
import type { SequenceAnalyzeRequest, SequenceAnalyzeResponse } from '@/lib/types/sequence'

export async function POST(request: NextRequest): Promise<NextResponse<SequenceAnalyzeResponse>> {
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
    const body: SequenceAnalyzeRequest = await request.json()
    const { repo, branch = 'main', trigger, maxDepth = 10 } = body

    if (!repo || !trigger?.target) {
      return NextResponse.json(
        { success: false, error: 'repo와 trigger.target이 필요합니다.' },
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

    // 7. 시퀀스 흐름 생성
    let flow = generateSequenceFromHandler(callGraph, trigger.target)

    if (!flow) {
      // 핸들러를 찾지 못한 경우, ID로 직접 검색
      const node = callGraph.nodes.find(n =>
        n.name === trigger.target ||
        n.id.includes(trigger.target)
      )

      if (node) {
        flow = generateSequenceFlow(callGraph, node.id, maxDepth)
      }
    }

    if (!flow) {
      return NextResponse.json(
        { success: false, error: `트리거를 찾을 수 없습니다: ${trigger.target}` },
        { status: 404 }
      )
    }

    // 8. Mermaid 코드 생성
    const mermaid = generateMermaidSequence(flow)

    const analysisTimeMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      flow,
      mermaid,
      analysisTimeMs,
    })
  } catch (error) {
    console.error('Sequence analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

/**
 * GET: 사용 가능한 트리거(이벤트 핸들러) 목록 반환
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await getGitHubTokenFromSession()
    if (!authResult.token) {
      return NextResponse.json(
        { success: false, error: authResult.error || '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const repo = searchParams.get('repo')
    const branch = searchParams.get('branch') || 'main'

    if (!repo) {
      return NextResponse.json(
        { success: false, error: 'repo 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }

    // 캐시된 분석 결과에서 진입점 반환
    const cacheKey = `tree:${repo}:${branch}`
    const tree = treeCache.get(cacheKey) as GitHubTreeItem[] | null

    if (!tree) {
      return NextResponse.json({
        success: true,
        triggers: [],
        message: '먼저 분석을 실행해주세요.',
      })
    }

    // TODO: 캐시된 호출 그래프에서 진입점 반환
    return NextResponse.json({
      success: true,
      triggers: [],
      message: '트리거 목록은 분석 후 사용 가능합니다.',
    })
  } catch (error) {
    console.error('Get triggers error:', error)
    return NextResponse.json(
      { success: false, error: '트리거 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
