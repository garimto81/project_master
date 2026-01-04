/**
 * Logic Flow API - GraphQL-based Analysis
 * GitHub GraphQL API를 사용하여 API 호출 최소화
 *
 * 장점:
 * - 단일 API 호출로 레포 정보 + 트리 + 이슈 조회
 * - 필요한 필드만 선택적으로 가져오기
 * - 네트워크 왕복 시간 대폭 감소
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import {
  githubGraphQL,
  REPO_ANALYSIS_QUERY,
  RepoAnalysisData,
  flattenTreeEntries,
  createMultiFileQuery,
} from '@/lib/github-graphql'
import { analysisCache } from '@/lib/analysis-cache'

interface Layer {
  name: string
  displayName: string
  modules: string[]
  description: string
}

// 파일 경로에서 레이어 추론
function inferLayer(path: string): string {
  const lowerPath = path.toLowerCase()

  if (lowerPath.includes('component') || lowerPath.includes('page') ||
      lowerPath.includes('view') || lowerPath.match(/\.(tsx|jsx)$/)) {
    return 'ui'
  }

  if (lowerPath.includes('api') || lowerPath.includes('route') ||
      lowerPath.includes('server')) {
    return 'server'
  }

  if (lowerPath.includes('model') || lowerPath.includes('store') ||
      lowerPath.includes('database') || lowerPath.includes('db')) {
    return 'data'
  }

  return 'logic'
}

// import 문 추출
function extractImports(content: string, filePath: string): Array<{ from: string; to: string; imports: string[] }> {
  const imports: Array<{ from: string; to: string; imports: string[] }> = []
  const lines = content.split('\n')

  for (const line of lines) {
    const namedImportMatch = line.match(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/)
    if (namedImportMatch) {
      const importedItems = namedImportMatch[1].split(',').map(s => s.trim().split(' as ')[0])
      imports.push({
        from: filePath,
        to: namedImportMatch[2],
        imports: importedItems,
      })
    }
  }

  return imports
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repo, path = 'src/', depth = 'medium', skipCache = false } = body

    if (!repo) {
      return NextResponse.json({ error: 'repo parameter required' }, { status: 400 })
    }

    const { token } = await getGitHubTokenFromSession()

    if (!token) {
      return NextResponse.json({ error: 'GitHub 인증이 필요합니다.' }, { status: 401 })
    }

    // 캐시 확인
    const cacheKey = `${repo}:${depth}:${path}:graphql`
    if (!skipCache) {
      const cached = analysisCache.get(cacheKey)
      if (cached) {
        return NextResponse.json({ ...cached, cached: true })
      }
    }

    const [owner, name] = repo.split('/')

    // 단일 GraphQL 호출로 모든 기본 정보 조회
    const data = await githubGraphQL<RepoAnalysisData>(
      REPO_ANALYSIS_QUERY,
      { owner, name, path },
      token
    )

    const repository = data.repository
    if (!repository.defaultBranchRef) {
      return NextResponse.json({ error: '기본 브랜치를 찾을 수 없습니다.' }, { status: 404 })
    }

    const branch = repository.defaultBranchRef.name
    const treeEntries = repository.defaultBranchRef.target.tree.entries

    // 트리를 평면 배열로 변환
    const allFiles = flattenTreeEntries(treeEntries)
    const codeFiles = allFiles.filter(f =>
      f.path.startsWith(path.replace(/^\//, '')) &&
      (f.path.endsWith('.ts') || f.path.endsWith('.tsx') ||
       f.path.endsWith('.js') || f.path.endsWith('.jsx'))
    )

    // 레이어별 파일 분류
    const layerFiles: Record<string, string[]> = {
      ui: [],
      logic: [],
      server: [],
      data: [],
    }

    for (const file of codeFiles) {
      const layer = inferLayer(file.path)
      const fileName = file.path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || ''
      if (!layerFiles[layer].includes(fileName)) {
        layerFiles[layer].push(fileName)
      }
    }

    // 레이어 생성
    const layers: Layer[] = [
      {
        name: 'ui',
        displayName: '화면 (UI)',
        modules: layerFiles.ui.slice(0, 8),
        description: '사용자가 보는 화면과 버튼',
      },
      {
        name: 'logic',
        displayName: '처리 (Logic)',
        modules: layerFiles.logic.slice(0, 8),
        description: '데이터 변환과 비즈니스 로직',
      },
      {
        name: 'server',
        displayName: '서버 (API)',
        modules: layerFiles.server.slice(0, 8),
        description: '외부 서버와의 통신',
      },
      {
        name: 'data',
        displayName: '저장 (Data)',
        modules: layerFiles.data.slice(0, 8),
        description: '데이터베이스와 상태 관리',
      },
    ].filter(layer => layer.modules.length > 0)

    // 연결 관계
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

    // 이슈 변환
    const issues = repository.issues.nodes.map(issue => ({
      number: issue.number,
      title: issue.title,
      labels: issue.labels.nodes.map(l => l.name),
    }))

    // 상세 분석이 필요한 경우 파일 내용 배치 조회
    const allImports: Array<{ from: string; to: string; imports: string[] }> = []

    if (depth !== 'shallow') {
      const filesToAnalyze = codeFiles.slice(0, depth === 'full' ? 10 : 5)

      if (filesToAnalyze.length > 0) {
        try {
          const multiFileQuery = createMultiFileQuery(
            filesToAnalyze.map(f => f.path),
            branch
          )

          const fileData = await githubGraphQL<{ repository: Record<string, { text?: string } | null> }>(
            multiFileQuery,
            { owner, name },
            token
          )

          // 파일 내용에서 import 추출
          for (const [key, value] of Object.entries(fileData.repository)) {
            if (value?.text) {
              const idx = parseInt(key.match(/^file(\d+)_/)?.[1] || '0')
              const filePath = filesToAnalyze[idx]?.path || ''
              const fileImports = extractImports(value.text, filePath)
              allImports.push(...fileImports)
            }
          }
        } catch (err) {
          console.warn('Multi-file query failed, continuing without detailed analysis:', err)
        }
      }
    }

    const response = {
      repo,
      level: 'overview',
      analysis_method: 'graphql',
      data_flow: {
        entry_points: codeFiles.filter(f =>
          f.path.includes('page.') || f.path.includes('route.')
        ).slice(0, 5).map(f => f.path),
        layers,
        connections,
      },
      circular_dependencies: [],
      unused_files: [],
      risk_points: [],
      issues,
      mermaid_code: '',
      stats: {
        totalFiles: codeFiles.length,
        analyzedFiles: depth === 'shallow' ? 0 : (depth === 'full' ? 10 : 5),
        totalDependencies: allImports.length,
        circularCount: 0,
        unusedCount: 0,
        apiCalls: 1,  // GraphQL 단일 호출
      },
      summary: `${repo}: ${layers.length}개 레이어, ${codeFiles.length}개 파일 (GraphQL)`,
      graphql: true,
    }

    // 캐시 저장
    analysisCache.set(cacheKey, response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('GraphQL analyze error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'GraphQL 분석 실패'
    }, { status: 500 })
  }
}
