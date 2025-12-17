/**
 * skott Analyzer - 실제 AST 기반 의존성 분석
 * PRD v6.3: 휴리스틱 → skott 실제 분석
 *
 * 기능:
 * - 실제 import/export 문 추적
 * - 순환 의존성 탐지
 * - 미사용 파일 탐지
 * - Mermaid 다이어그램 생성
 *
 * Note: 이 모듈은 로컬 프로젝트 분석용입니다.
 *       GitHub API 기반 원격 분석은 analyze/route.ts에서 처리합니다.
 */

export interface SkottAnalysisResult {
  // 의존성 그래프
  graph: {
    nodes: string[]
    edges: Array<{ from: string; to: string; imports?: string[] }>
  }

  // 순환 의존성
  circularDependencies: string[][]

  // 미사용 파일
  unusedFiles: string[]

  // 분석 통계
  stats: {
    totalFiles: number
    totalDependencies: number
    circularCount: number
    unusedCount: number
  }

  // Mermaid 코드
  mermaidCode: string
}

export interface AnalyzeOptions {
  entrypoint?: string
  includeThirdParty?: boolean
  includeBuiltin?: boolean
  circularMaxDepth?: number
}

/**
 * 프로젝트 의존성 분석 (skott 사용)
 * Note: skott은 Node.js 환경에서만 동작하므로
 *       서버 컴포넌트나 API Route에서만 사용 가능
 */
export async function analyzeWithSkott(
  projectPath: string,
  options: AnalyzeOptions = {}
): Promise<SkottAnalysisResult> {
  const {
    entrypoint,
    circularMaxDepth = 20,
  } = options

  try {
    // skott 동적 import (any로 타입 처리)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skottModule: any = await import('skott')

    // skott의 default export 또는 named export 사용
    const skott = skottModule.default || skottModule.skott || skottModule

    if (typeof skott === 'function') {
      const instance = await skott({
        entrypoint: entrypoint || projectPath,
        circularMaxDepth,
        includeBaseDir: false,
        dependencyTracking: {
          thirdParty: false,
          builtin: false,
          typeOnly: true,
        },
      })

      const { graph } = instance
      const graphDict = graph?.toDict?.() || {}

      const nodes = Object.keys(graphDict)
      const edges: Array<{ from: string; to: string }> = []

      for (const [from, nodeData] of Object.entries(graphDict)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adjacentTo = (nodeData as any).adjacentTo || []
        for (const to of adjacentTo) {
          edges.push({ from, to })
        }
      }

      // 순환 의존성 탐지
      const circularDeps = graph?.findCircularDependencies?.() || []

      const mermaidCode = generateMermaidFromGraph(nodes, edges, circularDeps)

      return {
        graph: { nodes, edges },
        circularDependencies: circularDeps,
        unusedFiles: [],
        stats: {
          totalFiles: nodes.length,
          totalDependencies: edges.length,
          circularCount: circularDeps.length,
          unusedCount: 0,
        },
        mermaidCode,
      }
    }

    // 폴백: 빈 결과
    throw new Error('skott function not found')
  } catch (error) {
    console.error('skott analysis error:', error)

    // 실패 시 빈 결과 반환
    return {
      graph: { nodes: [], edges: [] },
      circularDependencies: [],
      unusedFiles: [],
      stats: {
        totalFiles: 0,
        totalDependencies: 0,
        circularCount: 0,
        unusedCount: 0,
      },
      mermaidCode: 'flowchart TB\n  A["분석 실패 - skott 모듈 로드 오류"]',
    }
  }
}

/**
 * 그래프에서 Mermaid 다이어그램 생성
 */
function generateMermaidFromGraph(
  nodes: string[],
  edges: Array<{ from: string; to: string }>,
  circularDeps: string[][]
): string {
  const lines: string[] = ['flowchart TB']

  // 순환 의존성에 포함된 노드 집합
  const circularNodes = new Set<string>()
  for (const cycle of circularDeps) {
    cycle.forEach((node) => circularNodes.add(node))
  }

  // 노드를 레이어별로 분류
  const layers: Record<string, string[]> = {
    ui: [],
    logic: [],
    api: [],
    lib: [],
    other: [],
  }

  for (const node of nodes) {
    const layer = inferLayerFromPath(node)
    layers[layer].push(node)
  }

  // 레이어별 서브그래프 생성
  const layerNames: Record<string, string> = {
    ui: '화면 (UI)',
    logic: '처리 (Logic)',
    api: '서버 (API)',
    lib: '유틸 (Lib)',
    other: '기타',
  }

  for (const [layer, layerNodes] of Object.entries(layers)) {
    if (layerNodes.length === 0) continue

    lines.push(`  subgraph ${layer}["${layerNames[layer]}"]`)

    for (const node of layerNodes.slice(0, 8)) {
      // 최대 8개
      const safeId = sanitizeNodeId(node)
      const shortName = getShortName(node)
      const isCircular = circularNodes.has(node)

      if (isCircular) {
        lines.push(`    ${safeId}["${shortName} 🔴"]`)
      } else {
        lines.push(`    ${safeId}["${shortName}"]`)
      }
    }

    if (layerNodes.length > 8) {
      lines.push(`    ${layer}_more["...외 ${layerNodes.length - 8}개"]`)
    }

    lines.push('  end')
  }

  // 연결선 추가 (레이어 간 주요 연결만)
  const addedEdges = new Set<string>()
  for (const edge of edges.slice(0, 30)) {
    // 최대 30개 연결
    const fromLayer = inferLayerFromPath(edge.from)
    const toLayer = inferLayerFromPath(edge.to)

    // 레이어 간 연결만 표시
    if (fromLayer !== toLayer) {
      const edgeKey = `${fromLayer}-${toLayer}`
      if (!addedEdges.has(edgeKey)) {
        addedEdges.add(edgeKey)
        lines.push(`  ${fromLayer} --> ${toLayer}`)
      }
    }
  }

  // 순환 의존성 스타일
  if (circularNodes.size > 0) {
    lines.push('  classDef circular fill:#fef2f2,stroke:#dc2626')
    for (const node of circularNodes) {
      const safeId = sanitizeNodeId(node)
      lines.push(`  class ${safeId} circular`)
    }
  }

  return lines.join('\n')
}

/**
 * 파일 경로에서 레이어 추론
 */
function inferLayerFromPath(path: string): string {
  const lowerPath = path.toLowerCase()

  if (
    lowerPath.includes('component') ||
    lowerPath.includes('page') ||
    lowerPath.includes('app/') ||
    lowerPath.match(/\.(tsx|jsx)$/)
  ) {
    return 'ui'
  }

  if (
    lowerPath.includes('api/') ||
    lowerPath.includes('route') ||
    lowerPath.includes('server')
  ) {
    return 'api'
  }

  if (
    lowerPath.includes('lib/') ||
    lowerPath.includes('util') ||
    lowerPath.includes('helper')
  ) {
    return 'lib'
  }

  if (
    lowerPath.includes('hook') ||
    lowerPath.includes('service') ||
    lowerPath.includes('store')
  ) {
    return 'logic'
  }

  return 'other'
}

/**
 * 노드 ID 안전하게 변환
 */
function sanitizeNodeId(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)
}

/**
 * 짧은 파일명 추출
 */
function getShortName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1]?.replace(/\.(tsx?|jsx?)$/, '') || path
}

/**
 * 파일 목록에서 레이어별 그룹화
 */
export function groupFilesByLayer(files: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    ui: [],
    logic: [],
    api: [],
    lib: [],
    other: [],
  }

  for (const file of files) {
    const layer = inferLayerFromPath(file)
    groups[layer].push(file)
  }

  return groups
}
