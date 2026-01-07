/**
 * Data Trace API - 데이터 흐름 추적
 * PRD-0007 v1.4: 바이브 코더를 위한 인과관계 시각화
 *
 * "이 데이터는 어디서 와?" 에 대한 답변 제공
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import { analyzeDataFlowFromFiles } from '@/lib/data-flow-analyzer'
import { treeCache, GitHubTreeItem } from '@/lib/analysis-cache'
import type { DataTraceRequest, DataTraceResponse } from '@/lib/types/sequence'

export async function POST(request: NextRequest): Promise<NextResponse<DataTraceResponse>> {
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
    const body: DataTraceRequest = await request.json()
    const { repo, branch = 'main', target, direction = 'both' } = body

    if (!repo || !target?.name || !target?.file || !target?.line) {
      return NextResponse.json(
        { success: false, error: 'repo, target.name, target.file, target.line이 필요합니다.' },
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

    // 4. 대상 파일과 관련 파일 필터링
    const targetFileName = target.file.split('/').pop()
    const relatedFiles = tree.filter((item: GitHubTreeItem) => {
      if (item.type !== 'blob') return false
      if (!/\.(ts|tsx|js|jsx)$/.test(item.path)) return false
      if (item.path.includes('node_modules')) return false
      if (item.path.includes('.d.ts')) return false

      // 대상 파일과 같은 디렉토리 또는 import 관계가 있을 수 있는 파일
      const itemDir = item.path.split('/').slice(0, -1).join('/')
      const targetDir = target.file.split('/').slice(0, -1).join('/')

      return (
        item.path === target.file ||
        item.path.endsWith(targetFileName!) ||
        itemDir === targetDir ||
        item.path.includes('/lib/') ||
        item.path.includes('/hooks/') ||
        item.path.includes('/utils/')
      )
    })

    // 5. 파일 내용 가져오기 (최대 30개)
    const filesToAnalyze = relatedFiles.slice(0, 30)
    const fileContents: Array<{ path: string; content: string }> = []

    // 대상 파일 우선 가져오기
    const targetFile = filesToAnalyze.find((f: GitHubTreeItem) =>
      f.path === target.file || f.path.endsWith(targetFileName!)
    )

    if (!targetFile) {
      // 대상 파일이 목록에 없으면 직접 가져오기
      try {
        const contentResponse = await fetch(
          `https://api.github.com/repos/${repo}/contents/${target.file}?ref=${branch}`,
          {
            headers: {
              Authorization: `Bearer ${authResult.token}`,
              Accept: 'application/vnd.github.v3.raw',
            },
          }
        )

        if (contentResponse.ok) {
          const content = await contentResponse.text()
          fileContents.push({ path: target.file, content })
        }
      } catch {
        // 파일 읽기 실패
      }
    }

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
      if (result && !fileContents.find(f => f.path === result.path)) {
        fileContents.push(result)
      }
    }

    if (fileContents.length === 0) {
      return NextResponse.json(
        { success: false, error: '분석할 파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 6. 데이터 흐름 분석
    const result = analyzeDataFlowFromFiles(fileContents, {
      identifier: target.name,
      file: target.file,
      line: target.line,
      direction,
    })

    const analysisTimeMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      result,
      analysisTimeMs,
    })
  } catch (error) {
    console.error('Data trace error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
