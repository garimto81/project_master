/**
 * Logic Flow API - Code Analysis (Level 1-A: Big Picture)
 * PRD v6.3 Section 1.2: 비개발자 친화적 시각화 전략
 *
 * v6.3 업데이트:
 * - 실제 import 문 파싱으로 의존성 추출
 * - 순환 의존성 탐지
 * - 미사용 파일 탐지
 * - 분석 통계 추가
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

interface Layer {
  name: string
  displayName: string
  modules: string[]
  description: string
}

interface Connection {
  from: string
  to: string
  type: 'call' | 'fetch' | 'import' | 'event'
  label?: string
  imports?: string[]  // v6.3: 실제 import 항목
}

interface RiskPoint {
  location: string
  function: string
  risk: 'high' | 'medium' | 'low'
  reason: string
  suggestion: string
}

// v6.3: 순환 의존성
interface CircularDependency {
  cycle: string[]
  severity: 'warning' | 'error'
  suggestion: string
}

// v6.3: 분석 통계
interface AnalysisStats {
  totalFiles: number
  analyzedFiles: number
  totalDependencies: number
  circularCount: number
  unusedCount: number
}

interface AnalyzeResponse {
  repo: string
  level: 'overview'
  analysis_method: 'import-parsing'  // v6.3: 분석 방법 표시
  data_flow: {
    entry_points: string[]
    layers: Layer[]
    connections: Connection[]
  }
  circular_dependencies: CircularDependency[]  // v6.3
  unused_files: string[]  // v6.3
  risk_points: RiskPoint[]
  issues: Array<{
    number: number
    title: string
    labels: string[]
    related_layer?: string
  }>
  mermaid_code: string
  stats: AnalysisStats  // v6.3
  summary: string
}

// 파일 경로에서 레이어 추론
function inferLayer(path: string): string {
  const lowerPath = path.toLowerCase()

  // UI 레이어
  if (lowerPath.includes('component') || lowerPath.includes('page') ||
      lowerPath.includes('view') || lowerPath.includes('ui') ||
      lowerPath.match(/\.(tsx|jsx)$/)) {
    return 'ui'
  }

  // API/Server 레이어
  if (lowerPath.includes('api') || lowerPath.includes('route') ||
      lowerPath.includes('server') || lowerPath.includes('endpoint')) {
    return 'server'
  }

  // Data 레이어
  if (lowerPath.includes('model') || lowerPath.includes('schema') ||
      lowerPath.includes('database') || lowerPath.includes('db') ||
      lowerPath.includes('store') || lowerPath.includes('state')) {
    return 'data'
  }

  // Logic 레이어 (기본)
  if (lowerPath.includes('service') || lowerPath.includes('util') ||
      lowerPath.includes('lib') || lowerPath.includes('helper') ||
      lowerPath.includes('hook')) {
    return 'logic'
  }

  return 'logic' // 기본값
}

// 코드에서 위험 패턴 감지
function detectRiskPatterns(content: string, path: string): RiskPoint[] {
  const risks: RiskPoint[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // 패턴 1: try-catch 없는 fetch/API 호출
    if ((line.includes('fetch(') || line.includes('axios') || line.includes('.get(') || line.includes('.post(')) &&
        !lines.slice(Math.max(0, i - 5), i).some(l => l.includes('try'))) {
      // 다음 5줄 안에 catch가 있는지 확인
      const hasNearCatch = lines.slice(i, Math.min(lines.length, i + 10)).some(l => l.includes('catch'))
      if (!hasNearCatch) {
        risks.push({
          location: `${path}:${lineNum}`,
          function: extractFunctionName(lines, i),
          risk: 'high',
          reason: 'API 호출 후 에러 처리 없음',
          suggestion: 'try-catch 추가 또는 .catch() 핸들러 추가',
        })
      }
    }

    // 패턴 2: null/undefined 체크 없이 프로퍼티 접근
    const unsafeAccess = line.match(/(\w+)\.(\w+)\.(\w+)/)
    if (unsafeAccess && !line.includes('?.') && !line.includes('&&') &&
        !line.includes('if') && !line.includes('||')) {
      risks.push({
        location: `${path}:${lineNum}`,
        function: extractFunctionName(lines, i),
        risk: 'medium',
        reason: '깊은 프로퍼티 접근 시 null 체크 없음',
        suggestion: '옵셔널 체이닝(?.) 사용 권장',
      })
    }

    // 패턴 3: console.log 남아있음 (프로덕션 코드)
    if (line.includes('console.log') && !path.includes('test') && !path.includes('spec')) {
      risks.push({
        location: `${path}:${lineNum}`,
        function: extractFunctionName(lines, i),
        risk: 'low',
        reason: '디버그 로그가 프로덕션 코드에 남아있음',
        suggestion: '배포 전 console.log 제거 필요',
      })
    }
  }

  return risks.slice(0, 5) // 파일당 최대 5개
}

function extractFunctionName(lines: string[], currentIndex: number): string {
  // 위로 올라가면서 함수 정의 찾기
  for (let i = currentIndex; i >= Math.max(0, currentIndex - 20); i--) {
    const line = lines[i]
    const funcMatch = line.match(/(?:function|const|let|var)\s+(\w+)|(\w+)\s*[=:]\s*(?:async\s*)?\(/)
    if (funcMatch) {
      return funcMatch[1] || funcMatch[2] || 'anonymous'
    }
  }
  return 'anonymous'
}

// v6.3: 코드에서 import 문 추출
function extractImports(content: string, filePath: string): Array<{ from: string; to: string; imports: string[] }> {
  const imports: Array<{ from: string; to: string; imports: string[] }> = []
  const lines = content.split('\n')

  for (const line of lines) {
    // import { x, y } from './module'
    const namedImportMatch = line.match(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/)
    if (namedImportMatch) {
      const importedItems = namedImportMatch[1].split(',').map(s => s.trim().split(' as ')[0])
      const modulePath = namedImportMatch[2]
      imports.push({
        from: filePath,
        to: resolveImportPath(filePath, modulePath),
        imports: importedItems,
      })
      continue
    }

    // import x from './module'
    const defaultImportMatch = line.match(/import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/)
    if (defaultImportMatch) {
      imports.push({
        from: filePath,
        to: resolveImportPath(filePath, defaultImportMatch[2]),
        imports: [defaultImportMatch[1]],
      })
      continue
    }

    // import * as x from './module'
    const namespaceImportMatch = line.match(/import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/)
    if (namespaceImportMatch) {
      imports.push({
        from: filePath,
        to: resolveImportPath(filePath, namespaceImportMatch[2]),
        imports: [`* as ${namespaceImportMatch[1]}`],
      })
      continue
    }

    // import './module' (side effect)
    const sideEffectMatch = line.match(/import\s*['"]([^'"]+)['"]/)
    if (sideEffectMatch && !line.includes('from')) {
      imports.push({
        from: filePath,
        to: resolveImportPath(filePath, sideEffectMatch[1]),
        imports: ['(side effect)'],
      })
    }
  }

  return imports
}

// import 경로 해석
function resolveImportPath(fromPath: string, importPath: string): string {
  // 상대 경로가 아닌 경우 (패키지 import)
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
    return `node_modules/${importPath}`
  }

  // @/ alias 처리
  if (importPath.startsWith('@/')) {
    return importPath.replace('@/', 'src/')
  }

  // 상대 경로 해석 (간단한 버전)
  const fromDir = fromPath.split('/').slice(0, -1).join('/')
  const parts = importPath.split('/')
  let result = fromDir.split('/')

  for (const part of parts) {
    if (part === '..') {
      result.pop()
    } else if (part !== '.') {
      result.push(part)
    }
  }

  return result.join('/')
}

// v6.3: 순환 의존성 탐지 (DFS)
function detectCircularDependencies(
  imports: Array<{ from: string; to: string }>
): string[][] {
  const graph = new Map<string, string[]>()

  // 그래프 구축
  for (const imp of imports) {
    if (!graph.has(imp.from)) {
      graph.set(imp.from, [])
    }
    graph.get(imp.from)!.push(imp.to)
  }

  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function dfs(node: string, path: string[]): void {
    if (recursionStack.has(node)) {
      // 순환 발견
      const cycleStart = path.indexOf(node)
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), node])
      }
      return
    }

    if (visited.has(node)) {
      return
    }

    visited.add(node)
    recursionStack.add(node)

    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path, node])
    }

    recursionStack.delete(node)
  }

  for (const node of graph.keys()) {
    dfs(node, [])
  }

  return cycles
}

// v6.3: 미사용 파일 탐지
function detectUnusedFiles(
  allFiles: string[],
  imports: Array<{ from: string; to: string }>,
  entryPoints: string[]
): string[] {
  const importedFiles = new Set<string>()

  // 모든 import된 파일 수집
  for (const imp of imports) {
    importedFiles.add(imp.to)
  }

  // 진입점 추가
  for (const entry of entryPoints) {
    importedFiles.add(entry)
  }

  // import되지 않은 파일 찾기
  return allFiles.filter(file => {
    const normalizedFile = file.replace(/\.(tsx?|jsx?)$/, '')
    return !importedFiles.has(normalizedFile) &&
           !importedFiles.has(file) &&
           !file.includes('test') &&
           !file.includes('spec') &&
           !file.includes('.d.ts')
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repo, path = 'src/', depth = 'medium', include_risk = true } = body

    if (!repo) {
      return NextResponse.json({ error: 'repo parameter required' }, { status: 400 })
    }

    // 인증 확인
    const { token } = await getGitHubTokenFromSession()

    if (!token) {
      return NextResponse.json({ error: 'GitHub 인증이 필요합니다. 로그인해주세요.' }, { status: 401 })
    }

    const [owner, repoName] = repo.split('/')

    // 1. 레포지토리 트리 가져오기
    let treeData: any = { tree: [] }
    const branches = ['main', 'master']

    for (const branch of branches) {
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      )

      if (treeResponse.ok) {
        treeData = await treeResponse.json()
        break
      }
    }

    // 2. 이슈 목록 가져오기
    const issuesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/issues?state=open&per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    const issuesData = issuesResponse.ok ? await issuesResponse.json() : []

    // 3. 레이어별 파일 분류
    const layerFiles: Record<string, string[]> = {
      ui: [],
      logic: [],
      server: [],
      data: [],
    }

    const codeFiles = (treeData.tree || []).filter((item: any) =>
      item.type === 'blob' &&
      item.path.startsWith(path.replace(/^\//, '')) &&
      (item.path.endsWith('.ts') || item.path.endsWith('.tsx') ||
       item.path.endsWith('.js') || item.path.endsWith('.jsx') ||
       item.path.endsWith('.py'))
    )

    for (const file of codeFiles) {
      const layer = inferLayer(file.path)
      const fileName = file.path.split('/').pop()?.replace(/\.(tsx?|jsx?|py)$/, '') || ''
      if (!layerFiles[layer].includes(fileName)) {
        layerFiles[layer].push(fileName)
      }
    }

    // 4. 레이어 정보 생성
    const layers: Layer[] = [
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

    // 5. 연결 관계 추론 (간단한 휴리스틱)
    const connections: Connection[] = []

    if (layerFiles.ui.length > 0 && layerFiles.logic.length > 0) {
      connections.push({
        from: 'ui',
        to: 'logic',
        type: 'call',
        label: '이벤트 처리',
      })
    }

    if (layerFiles.logic.length > 0 && layerFiles.server.length > 0) {
      connections.push({
        from: 'logic',
        to: 'server',
        type: 'fetch',
        label: 'API 호출',
      })
    }

    if (layerFiles.server.length > 0 && layerFiles.data.length > 0) {
      connections.push({
        from: 'server',
        to: 'data',
        type: 'call',
        label: '데이터 저장',
      })
    }

    if (layerFiles.logic.length > 0 && layerFiles.data.length > 0) {
      connections.push({
        from: 'logic',
        to: 'data',
        type: 'call',
        label: '상태 관리',
      })
    }

    // 6. 위험 지점 분석 + import 파싱 (depth에 따라)
    let riskPoints: RiskPoint[] = []
    const allImports: Array<{ from: string; to: string; imports: string[] }> = []

    if (include_risk && depth !== 'shallow') {
      // 주요 파일 몇 개만 분석 (API 요청 제한)
      const filesToAnalyze = codeFiles.slice(0, depth === 'full' ? 15 : 8)

      for (const file of filesToAnalyze) {
        try {
          const contentResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
              },
            }
          )

          if (contentResponse.ok) {
            const contentData = await contentResponse.json()
            if (contentData.content) {
              const content = Buffer.from(contentData.content, 'base64').toString('utf-8')

              // 위험 패턴 분석
              const fileRisks = detectRiskPatterns(content, file.path)
              riskPoints.push(...fileRisks)

              // v6.3: import 문 추출
              const fileImports = extractImports(content, file.path)
              allImports.push(...fileImports)
            }
          }
        } catch (e) {
          // 개별 파일 분석 실패는 무시
        }
      }
    }

    // v6.3: 순환 의존성 탐지
    const cycles = detectCircularDependencies(allImports)
    const circularDependencies: CircularDependency[] = cycles.map(cycle => ({
      cycle,
      severity: cycle.length > 3 ? 'error' : 'warning',
      suggestion: '의존성 방향 재설계 또는 인터페이스 분리 권장',
    }))

    // v6.3: 미사용 파일 탐지
    const entryPoints = codeFiles
      .filter((f: any) => f.path.includes('page.') || f.path.includes('route.') || f.path.includes('index.'))
      .map((f: any) => f.path)
    const unusedFiles = detectUnusedFiles(
      codeFiles.map((f: any) => f.path),
      allImports,
      entryPoints
    )

    // v6.3: 실제 import 기반 connections 생성
    const importConnections: Connection[] = []
    const addedConnections = new Set<string>()

    for (const imp of allImports.slice(0, 20)) {
      // node_modules는 제외
      if (imp.to.includes('node_modules')) continue

      const fromLayer = inferLayer(imp.from)
      const toLayer = inferLayer(imp.to)
      const connKey = `${fromLayer}-${toLayer}`

      if (!addedConnections.has(connKey) && fromLayer !== toLayer) {
        addedConnections.add(connKey)
        importConnections.push({
          from: fromLayer,
          to: toLayer,
          type: 'import',
          label: `${imp.imports.slice(0, 2).join(', ')}${imp.imports.length > 2 ? '...' : ''}`,
          imports: imp.imports,
        })
      }
    }

    // 기존 휴리스틱 connections에 import 기반 추가
    const finalConnections = [...connections, ...importConnections.filter(
      ic => !connections.some(c => c.from === ic.from && c.to === ic.to)
    )]

    // 7. 이슈 정보 변환 및 레이어 연결
    const issues = issuesData.slice(0, 10).map((issue: any) => {
      let relatedLayer: string | undefined

      const titleLower = issue.title.toLowerCase()
      const bodyLower = (issue.body || '').toLowerCase()

      if (titleLower.includes('ui') || titleLower.includes('화면') || bodyLower.includes('component')) {
        relatedLayer = 'ui'
      } else if (titleLower.includes('api') || titleLower.includes('서버')) {
        relatedLayer = 'server'
      } else if (titleLower.includes('db') || titleLower.includes('데이터')) {
        relatedLayer = 'data'
      }

      return {
        number: issue.number,
        title: issue.title,
        labels: issue.labels.map((l: any) => l.name),
        related_layer: relatedLayer,
      }
    })

    // 8. Mermaid 다이어그램 생성 (데이터 흐름도) - Issue #6 개선
    // 레이어별 색상 정의
    const LAYER_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
      ui: { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' },
      logic: { fill: '#dcfce7', stroke: '#22c55e', text: '#166534' },
      server: { fill: '#ffedd5', stroke: '#f97316', text: '#9a3412' },
      data: { fill: '#e0e7ff', stroke: '#6366f1', text: '#3730a3' },
    }

    // 순환 의존성에 포함된 파일 추출
    const circularFiles = new Set<string>()
    for (const cd of circularDependencies) {
      cd.cycle.forEach(file => {
        const fileName = file.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || ''
        circularFiles.add(fileName)
      })
    }

    const mermaidLines = [
      'flowchart TB',
      '  subgraph User["👤 사용자"]',
      '    action["행동/입력"]',
      '  end',
    ]

    // 레이어 서브그래프 (색상 적용)
    for (const layer of layers) {
      const hasIssue = issues.some((i: any) => i.related_layer === layer.name)
      const colors = LAYER_COLORS[layer.name] || LAYER_COLORS.logic

      mermaidLines.push(`  subgraph ${layer.name}["${layer.displayName}"]`)
      mermaidLines.push(`    style ${layer.name} fill:${colors.fill},stroke:${colors.stroke}`)

      for (const mod of layer.modules.slice(0, 4)) {
        const safeMod = mod.replace(/[^a-zA-Z0-9]/g, '_')
        const nodeId = `${layer.name}_${safeMod}`
        const isCircular = circularFiles.has(mod)
        const icon = isCircular ? '🔴 ' : ''

        mermaidLines.push(`    ${nodeId}["${icon}${mod}"]`)

        // 순환 의존성 노드 스타일
        if (isCircular) {
          mermaidLines.push(`    style ${nodeId} fill:#fef2f2,stroke:#dc2626,stroke-width:3px`)
        }
      }

      if (layer.modules.length > 4) {
        mermaidLines.push(`    ${layer.name}_more["...외 ${layer.modules.length - 4}개"]`)
      }

      mermaidLines.push('  end')
    }

    // 연결선 (타입에 따른 스타일)
    mermaidLines.push('  action --> ui')

    for (const conn of connections) {
      const label = conn.label || ''
      // 타입에 따른 연결선 스타일
      if (conn.type === 'import') {
        mermaidLines.push(`  ${conn.from} -.->|"${label}"| ${conn.to}`)
      } else {
        mermaidLines.push(`  ${conn.from} -->|"${label}"| ${conn.to}`)
      }
    }

    // 순환 의존성 연결선 (빨간 점선)
    for (const cd of circularDependencies.slice(0, 3)) {
      if (cd.cycle.length >= 2) {
        const from = inferLayer(cd.cycle[0])
        const to = inferLayer(cd.cycle[1])
        if (from !== to) {
          mermaidLines.push(`  ${from} <-.->|"⚠️ 순환"| ${to}`)
        }
      }
    }

    // 레이어별 스타일 클래스 정의
    mermaidLines.push(`  classDef ui fill:${LAYER_COLORS.ui.fill},stroke:${LAYER_COLORS.ui.stroke},color:${LAYER_COLORS.ui.text}`)
    mermaidLines.push(`  classDef logic fill:${LAYER_COLORS.logic.fill},stroke:${LAYER_COLORS.logic.stroke},color:${LAYER_COLORS.logic.text}`)
    mermaidLines.push(`  classDef server fill:${LAYER_COLORS.server.fill},stroke:${LAYER_COLORS.server.stroke},color:${LAYER_COLORS.server.text}`)
    mermaidLines.push(`  classDef data fill:${LAYER_COLORS.data.fill},stroke:${LAYER_COLORS.data.stroke},color:${LAYER_COLORS.data.text}`)
    mermaidLines.push('  classDef hasIssue fill:#fef2f2,stroke:#dc2626,stroke-dasharray:5 5')
    mermaidLines.push('  classDef circular fill:#fef2f2,stroke:#dc2626,stroke-width:3px')

    // 이슈 있는 레이어에 스타일 적용
    for (const issue of issues) {
      if (issue.related_layer) {
        mermaidLines.push(`  class ${issue.related_layer} hasIssue`)
      }
    }

    // 레이어 클래스 적용
    for (const layer of layers) {
      mermaidLines.push(`  class ${layer.name} ${layer.name}`)
    }

    // v6.3: 분석 통계
    const stats: AnalysisStats = {
      totalFiles: codeFiles.length,
      analyzedFiles: depth === 'shallow' ? 0 : (depth === 'full' ? 15 : 8),
      totalDependencies: allImports.length,
      circularCount: circularDependencies.length,
      unusedCount: unusedFiles.length,
    }

    const response: AnalyzeResponse = {
      repo,
      level: 'overview',
      analysis_method: 'import-parsing',
      data_flow: {
        entry_points: entryPoints.slice(0, 5),
        layers,
        connections: finalConnections,
      },
      circular_dependencies: circularDependencies,
      unused_files: unusedFiles.slice(0, 10),
      risk_points: riskPoints.slice(0, 10),
      issues,
      mermaid_code: mermaidLines.join('\n'),
      stats,
      summary: `${repo}: ${layers.length}개 레이어, ${allImports.length}개 의존성, ${circularDependencies.length}개 순환, ${riskPoints.length}개 위험 지점`,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Logic flow analyze error:', error)
    return NextResponse.json({ error: '코드 분석을 수행할 수 없습니다' }, { status: 500 })
  }
}
