/**
 * Logic Flow API - AST Analysis (PRD-0007)
 * ts-morph 기반 심층 코드 분석
 *
 * 기능:
 * - 함수/클래스/타입 추출
 * - Export 패턴 기반 레이어 분류
 * - React 컴포넌트, Custom Hook 판별
 * - Supabase 호출 탐지
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import {
  analyzeMultipleFiles,
  type FileAnalysis,
  type AstAnalysisResult,
  type LayerType,
} from '@/lib/ast-analyzer'

// ============================================================
// 타입 정의
// ============================================================

interface AstAnalyzeRequest {
  repo: string
  branch?: string
  paths?: string[]
  depth?: 'shallow' | 'medium' | 'deep'
}

interface AstAnalyzeResponse extends AstAnalysisResult {
  repo: string
  branch: string
  mermaidCode: string
}

interface GitHubTreeItem {
  path: string
  type: string
  sha?: string
  size?: number
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[]
  truncated?: boolean
}

// ============================================================
// 상수
// ============================================================

const DEPTH_CONFIG = {
  shallow: { maxFiles: 10, skipContent: true },
  medium: { maxFiles: 30, skipContent: false },
  deep: { maxFiles: 100, skipContent: false },
}

const LAYER_COLORS: Record<LayerType, { fill: string; stroke: string; text: string }> = {
  ui: { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' },
  logic: { fill: '#dcfce7', stroke: '#22c55e', text: '#166534' },
  api: { fill: '#ffedd5', stroke: '#f97316', text: '#9a3412' },
  data: { fill: '#e0e7ff', stroke: '#6366f1', text: '#3730a3' },
  lib: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e' },
  unknown: { fill: '#f3f4f6', stroke: '#6b7280', text: '#374151' },
}

const LAYER_NAMES: Record<LayerType, string> = {
  ui: '화면 (UI)',
  logic: '처리 (Logic)',
  api: '서버 (API)',
  data: '데이터 (Data)',
  lib: '유틸 (Lib)',
  unknown: '기타',
}

// ============================================================
// POST 핸들러
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. 요청 파싱
    let body: AstAnalyzeRequest
    try {
      const text = await request.text()
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
      }
      body = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { repo, branch = 'main', paths = ['src/'], depth = 'medium' } = body

    if (!repo) {
      return NextResponse.json({ error: 'repo parameter required' }, { status: 400 })
    }

    // 2. 인증 확인
    const { token } = await getGitHubTokenFromSession()
    if (!token) {
      return NextResponse.json(
        { error: 'GitHub 인증이 필요합니다. 로그인해주세요.' },
        { status: 401 }
      )
    }

    const [owner, repoName] = repo.split('/')
    const depthConfig = DEPTH_CONFIG[depth]

    // 3. 레포지토리 트리 가져오기
    const treeData = await fetchRepoTree(owner, repoName, branch, token)

    // 4. 분석할 파일 필터링
    const codeFiles = filterCodeFiles(treeData.tree, paths, depthConfig.maxFiles)

    if (codeFiles.length === 0) {
      return NextResponse.json({
        repo,
        branch,
        files: [],
        stats: {
          totalFiles: 0,
          totalFunctions: 0,
          totalClasses: 0,
          analysisTimeMs: Date.now() - startTime,
          byLayer: { ui: 0, logic: 0, api: 0, data: 0, lib: 0, unknown: 0 },
        },
        mermaidCode: 'flowchart TB\n  A["분석할 파일 없음"]',
      })
    }

    // 5. 파일 내용 가져오기 및 분석
    let analysisResult: AstAnalysisResult

    if (depthConfig.skipContent) {
      // shallow: 경로 기반만 분석
      analysisResult = analyzeByPathOnly(codeFiles)
    } else {
      // medium/deep: 실제 코드 분석
      const filesWithContent = await fetchFileContents(
        owner,
        repoName,
        codeFiles,
        token
      )
      analysisResult = analyzeMultipleFiles(filesWithContent)
    }

    // 6. Mermaid 다이어그램 생성
    const mermaidCode = generateMermaidDiagram(analysisResult.files)

    // 7. 응답 반환
    const response: AstAnalyzeResponse = {
      repo,
      branch,
      ...analysisResult,
      stats: {
        ...analysisResult.stats,
        analysisTimeMs: Date.now() - startTime,
      },
      mermaidCode,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('AST analyze error:', error)
    return NextResponse.json(
      { error: 'AST 분석을 수행할 수 없습니다', details: String(error) },
      { status: 500 }
    )
  }
}

// ============================================================
// 헬퍼 함수
// ============================================================

async function fetchRepoTree(
  owner: string,
  repoName: string,
  branch: string,
  token: string
): Promise<GitHubTreeResponse> {
  const branches = branch === 'main' ? ['main', 'master'] : [branch]

  for (const b of branches) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/${b}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (response.ok) {
      return response.json()
    }
  }

  throw new Error(`Failed to fetch repository tree for ${owner}/${repoName}`)
}

function filterCodeFiles(
  tree: GitHubTreeItem[],
  paths: string[],
  maxFiles: number
): GitHubTreeItem[] {
  const normalizedPaths = paths.map((p) => p.replace(/^\//, '').replace(/\/$/, ''))

  return tree
    .filter((item) => {
      if (item.type !== 'blob') return false

      // TypeScript/JavaScript 파일만
      if (!item.path.match(/\.(tsx?|jsx?)$/)) return false

      // 테스트 파일 제외
      if (item.path.includes('.test.') || item.path.includes('.spec.')) return false
      if (item.path.includes('__tests__')) return false

      // 설정 파일 제외
      if (item.path.includes('.config.')) return false
      if (item.path.endsWith('.d.ts')) return false

      // 경로 필터
      const matchesPath = normalizedPaths.some(
        (p) => item.path.startsWith(p) || item.path.startsWith(`${p}/`)
      )

      return matchesPath
    })
    .slice(0, maxFiles)
}

async function fetchFileContents(
  owner: string,
  repoName: string,
  files: GitHubTreeItem[],
  token: string
): Promise<Array<{ path: string; content: string }>> {
  const results: Array<{ path: string; content: string }> = []

  // 병렬 요청 (최대 5개씩)
  const batchSize = 5
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            if (data.content) {
              const content = Buffer.from(data.content, 'base64').toString('utf-8')
              return { path: file.path, content }
            }
          }
        } catch {
          // 개별 파일 실패는 무시
        }
        return null
      })
    )

    results.push(
      ...batchResults.filter((r): r is { path: string; content: string } => r !== null)
    )
  }

  return results
}

function analyzeByPathOnly(files: GitHubTreeItem[]): AstAnalysisResult {
  const byLayer: Record<LayerType, number> = {
    ui: 0,
    logic: 0,
    api: 0,
    data: 0,
    lib: 0,
    unknown: 0,
  }

  const fileAnalyses: FileAnalysis[] = files.map((file) => {
    const layer = inferLayerFromPath(file.path)
    byLayer[layer]++

    return {
      path: file.path,
      layer,
      functions: [],
      classes: [],
      exports: [],
      imports: [],
      hasJsx: file.path.endsWith('.tsx') || file.path.endsWith('.jsx'),
      hasSupabase: false,
      isApiRoute: file.path.includes('/api/') && file.path.includes('route.'),
    }
  })

  return {
    files: fileAnalyses,
    stats: {
      totalFiles: files.length,
      totalFunctions: 0,
      totalClasses: 0,
      analysisTimeMs: 0,
      byLayer,
    },
  }
}

function inferLayerFromPath(path: string): LayerType {
  const lowerPath = path.toLowerCase()

  if (lowerPath.includes('/api/') && lowerPath.includes('route.')) {
    return 'api'
  }

  if (
    lowerPath.includes('/components/') ||
    lowerPath.includes('/pages/') ||
    lowerPath.includes('/app/') && !lowerPath.includes('/api/')
  ) {
    return 'ui'
  }

  if (
    lowerPath.includes('/hooks/') ||
    lowerPath.includes('/services/') ||
    lowerPath.includes('/stores/')
  ) {
    return 'logic'
  }

  if (lowerPath.includes('/lib/') || lowerPath.includes('/utils/')) {
    return 'lib'
  }

  if (lowerPath.includes('/db/') || lowerPath.includes('/database/')) {
    return 'data'
  }

  // 파일 확장자로 추론
  if (lowerPath.endsWith('.tsx') || lowerPath.endsWith('.jsx')) {
    return 'ui'
  }

  return 'unknown'
}

function generateMermaidDiagram(files: FileAnalysis[]): string {
  const lines: string[] = ['flowchart TB']

  // 레이어별 그룹화
  const byLayer: Record<LayerType, FileAnalysis[]> = {
    ui: [],
    logic: [],
    api: [],
    data: [],
    lib: [],
    unknown: [],
  }

  for (const file of files) {
    byLayer[file.layer].push(file)
  }

  // 레이어 서브그래프 생성
  for (const [layer, layerFiles] of Object.entries(byLayer)) {
    if (layerFiles.length === 0) continue

    const colors = LAYER_COLORS[layer as LayerType]
    const displayName = LAYER_NAMES[layer as LayerType]

    lines.push(`  subgraph ${layer}["${displayName}"]`)
    lines.push(`    style ${layer} fill:${colors.fill},stroke:${colors.stroke}`)

    // 컴포넌트/함수가 있는 파일 우선 표시
    const sortedFiles = [...layerFiles].sort((a, b) => {
      const aScore = a.functions.length + a.classes.length
      const bScore = b.functions.length + b.classes.length
      return bScore - aScore
    })

    for (const file of sortedFiles.slice(0, 6)) {
      const fileName = file.path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || ''
      const safeId = sanitizeNodeId(file.path)

      // 아이콘 선택
      let icon = ''
      if (file.functions.some((f) => f.type === 'component')) icon = '🧩 '
      else if (file.functions.some((f) => f.type === 'hook')) icon = '🪝 '
      else if (file.isApiRoute) icon = '🔌 '
      else if (file.hasSupabase) icon = '🗄️ '

      const funcCount = file.functions.length
      const label = funcCount > 0 ? `${icon}${fileName} (${funcCount})` : `${icon}${fileName}`

      lines.push(`    ${safeId}["${label}"]`)
    }

    if (layerFiles.length > 6) {
      lines.push(`    ${layer}_more["...외 ${layerFiles.length - 6}개"]`)
    }

    lines.push('  end')
  }

  // 레이어 간 연결
  const layerOrder: LayerType[] = ['ui', 'logic', 'api', 'data']
  for (let i = 0; i < layerOrder.length - 1; i++) {
    const from = layerOrder[i]
    const to = layerOrder[i + 1]
    if (byLayer[from].length > 0 && byLayer[to].length > 0) {
      lines.push(`  ${from} --> ${to}`)
    }
  }

  // lib 연결
  if (byLayer.lib.length > 0) {
    for (const layer of layerOrder) {
      if (byLayer[layer].length > 0) {
        lines.push(`  ${layer} -.-> lib`)
        break
      }
    }
  }

  // 스타일 정의
  for (const [layer, colors] of Object.entries(LAYER_COLORS)) {
    lines.push(
      `  classDef ${layer} fill:${colors.fill},stroke:${colors.stroke},color:${colors.text}`
    )
  }

  return lines.join('\n')
}

function sanitizeNodeId(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)
}

// ============================================================
// GET 핸들러 (간단한 테스트용)
// ============================================================

export async function GET() {
  return NextResponse.json({
    name: 'AST Analysis API',
    version: '1.0.0',
    description: 'ts-morph 기반 심층 코드 분석 API (PRD-0007)',
    usage: {
      method: 'POST',
      body: {
        repo: 'owner/repo (required)',
        branch: 'main (default)',
        paths: "['src/'] (default)",
        depth: "shallow | medium | deep (default: 'medium')",
      },
    },
  })
}
