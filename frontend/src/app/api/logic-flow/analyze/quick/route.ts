/**
 * Logic Flow API - Quick Analysis (점진적 로딩)
 * 초기 로딩 1초 목표: 기본 레이어 구조만 빠르게 반환
 *
 * 사용법:
 * 1. /api/logic-flow/analyze/quick 호출 → 1초 내 기본 구조 반환
 * 2. 클라이언트에서 /api/logic-flow/analyze 호출 → 상세 분석 (백그라운드)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import { treeCache, GitHubTreeItem } from '@/lib/analysis-cache'
import { inferLayerQuick } from '@/lib/layer-classifier'

interface GitHubTreeResponse {
  tree: GitHubTreeItem[]
  truncated?: boolean
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { repo, path = 'src/' } = body

    if (!repo) {
      return NextResponse.json({ error: 'repo parameter required' }, { status: 400 })
    }

    const { token } = await getGitHubTokenFromSession()

    if (!token) {
      return NextResponse.json({ error: 'GitHub 인증이 필요합니다.' }, { status: 401 })
    }

    const [owner, repoName] = repo.split('/')

    // 트리 캐시 확인
    const treeCacheKey = `${repo}:tree`
    let treeData: GitHubTreeResponse = treeCache.get(treeCacheKey) ?? { tree: [] }

    if (treeData.tree.length === 0) {
      // 빠른 트리 조회 (타임아웃 3초)
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/trees/main?recursive=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          signal: AbortSignal.timeout(3000),
        }
      )

      if (!treeResponse.ok) {
        // master 브랜치 시도
        const masterResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/git/trees/master?recursive=1`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
            signal: AbortSignal.timeout(3000),
          }
        )

        if (!masterResponse.ok) {
          return NextResponse.json({ error: '레포 접근 실패' }, { status: 404 })
        }

        treeData = await masterResponse.json()
      } else {
        treeData = await treeResponse.json()
      }

      treeCache.set(treeCacheKey, treeData)
    }

    // 빠른 레이어 분류 (상위 50개 파일만)
    const codeFiles = treeData.tree
      .filter((item: GitHubTreeItem) =>
        item.type === 'blob' &&
        item.path.startsWith(path.replace(/^\//, '')) &&
        (item.path.endsWith('.ts') || item.path.endsWith('.tsx') ||
         item.path.endsWith('.js') || item.path.endsWith('.jsx'))
      )
      .slice(0, 50)

    const layerFiles: Record<string, string[]> = {
      ui: [],
      logic: [],
      server: [],
      data: [],
    }

    for (const file of codeFiles) {
      const layer = inferLayerQuick(file.path)
      const fileName = file.path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || ''
      if (!layerFiles[layer].includes(fileName)) {
        layerFiles[layer].push(fileName)
      }
    }

    // 기본 레이어 구조 생성
    const layers = [
      {
        name: 'ui',
        displayName: '화면 (UI)',
        modules: layerFiles.ui.slice(0, 6),
        description: '사용자가 보는 화면과 버튼',
      },
      {
        name: 'logic',
        displayName: '처리 (Logic)',
        modules: layerFiles.logic.slice(0, 6),
        description: '데이터 변환과 비즈니스 로직',
      },
      {
        name: 'server',
        displayName: '서버 (API)',
        modules: layerFiles.server.slice(0, 6),
        description: '외부 서버와의 통신',
      },
      {
        name: 'data',
        displayName: '저장 (Data)',
        modules: layerFiles.data.slice(0, 6),
        description: '데이터베이스와 상태 관리',
      },
    ].filter(layer => layer.modules.length > 0)

    // 기본 연결 (휴리스틱)
    const connections = []
    if (layerFiles.ui.length > 0 && layerFiles.logic.length > 0) {
      connections.push({ from: 'ui', to: 'logic', type: 'call', label: '이벤트 처리' })
    }
    if (layerFiles.logic.length > 0 && layerFiles.server.length > 0) {
      connections.push({ from: 'logic', to: 'server', type: 'fetch', label: 'API 호출' })
    }
    if (layerFiles.server.length > 0 && layerFiles.data.length > 0) {
      connections.push({ from: 'server', to: 'data', type: 'call', label: '데이터 저장' })
    }

    const loadTimeMs = Date.now() - startTime

    return NextResponse.json({
      repo,
      level: 'quick',
      analysis_method: 'quick-scan',
      data_flow: {
        entry_points: [],
        layers,
        connections,
      },
      circular_dependencies: [],
      unused_files: [],
      risk_points: [],
      issues: [],
      mermaid_code: '',
      stats: {
        totalFiles: codeFiles.length,
        analyzedFiles: 0,
        totalDependencies: 0,
        circularCount: 0,
        unusedCount: 0,
      },
      summary: `${repo}: ${layers.length}개 레이어 (빠른 스캔, ${loadTimeMs}ms)`,
      quick: true,
      load_time_ms: loadTimeMs,
    })

  } catch (error) {
    console.error('Quick analyze error:', error)
    return NextResponse.json({ error: '빠른 분석 실패' }, { status: 500 })
  }
}
