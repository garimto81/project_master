/**
 * Impact Analyzer - 영향도 분석 알고리즘
 * PRD-0007 v1.4: 바이브 코더를 위한 인과관계 시각화
 *
 * 핵심 기능:
 * - 역방향 BFS로 호출자 추적 (reverseTraverseBFS)
 * - 진입점 도달 분석
 * - 비개발자용 요약 생성
 */

import type {
  ImpactAnalysisResult,
  ImpactTarget,
  ImpactNode,
  EntryPointImpact,
  ImpactSummary,
  ImpactVisualization,
} from './types/sequence'
import type { CallGraphResult, FunctionNode, CallEdge } from './call-graph-analyzer'
import { getFriendlyLabel, getFunctionIcon } from './function-labels'

// ============================================================
// 메인 분석 함수
// ============================================================

/**
 * 영향도 분석 실행
 * "이 함수 지우면 뭐가 깨져?" 에 대한 답변 생성
 */
export function analyzeImpact(
  callGraph: CallGraphResult,
  targetFunctionId: string,
  maxDepth: number = 5
): ImpactAnalysisResult {
  // 1. 대상 함수 찾기
  const targetNode = callGraph.nodes.find(n => n.id === targetFunctionId)
  if (!targetNode) {
    throw new Error(`Function not found: ${targetFunctionId}`)
  }

  const target: ImpactTarget = {
    id: targetNode.id,
    name: targetNode.name,
    displayName: getFriendlyLabel(targetNode.name),
    type: classifyNodeType(targetNode),
    file: targetNode.file,
    line: targetNode.line,
  }

  // 2. 역방향 BFS로 호출자 추적
  const callers = reverseTraverseBFS(callGraph, targetFunctionId, maxDepth)

  // 3. 진입점 도달 분석
  const affectedEntryPoints = findAffectedEntryPoints(callGraph, callers)

  // 4. 비개발자용 요약 생성
  const summary = generateHumanReadableSummary(target, callers, affectedEntryPoints)

  // 5. 시각화 데이터 생성
  const visualizationData = generateVisualization(target, callers, affectedEntryPoints)

  return {
    target,
    affectedCallers: callers,
    affectedEntryPoints,
    summary,
    visualizationData,
  }
}

// ============================================================
// 역방향 BFS 탐색
// ============================================================

/**
 * 역방향 BFS로 호출자 추적
 * 대상 함수를 호출하는 모든 함수를 탐색
 */
export function reverseTraverseBFS(
  callGraph: CallGraphResult,
  targetId: string,
  maxDepth: number
): ImpactNode[] {
  const visited = new Set<string>()
  const result: ImpactNode[] = []
  const queue: Array<{ id: string; depth: number; path: string[] }> = []

  // 시작: 대상을 호출하는 직접 호출자들
  const directCallers = findDirectCallers(callGraph.edges, targetId)
  for (const callerId of directCallers) {
    queue.push({ id: callerId, depth: 1, path: [targetId, callerId] })
  }

  while (queue.length > 0) {
    const current = queue.shift()!

    if (visited.has(current.id) || current.depth > maxDepth) {
      continue
    }
    visited.add(current.id)

    const node = callGraph.nodes.find(n => n.id === current.id)
    if (!node) continue

    result.push({
      id: node.id,
      name: node.name,
      displayName: getFriendlyLabel(node.name),
      file: node.file,
      line: node.line,
      depth: current.depth,
      impactLevel: current.depth === 1 ? 'direct' : 'indirect',
      callPath: current.path,
    })

    // 이 함수의 호출자들도 탐색
    const nextCallers = findDirectCallers(callGraph.edges, current.id)
    for (const callerId of nextCallers) {
      if (!visited.has(callerId)) {
        queue.push({
          id: callerId,
          depth: current.depth + 1,
          path: [...current.path, callerId],
        })
      }
    }
  }

  return result
}

/**
 * 직접 호출자 찾기
 */
function findDirectCallers(edges: CallEdge[], targetId: string): string[] {
  return edges
    .filter(e => e.toId === targetId)
    .map(e => e.fromId)
    .filter((id, index, self) => self.indexOf(id) === index) // 중복 제거
}

// ============================================================
// 진입점 분석
// ============================================================

/**
 * 영향받는 진입점 찾기
 * UI 이벤트 핸들러, API 라우트, useEffect 등
 */
export function findAffectedEntryPoints(
  callGraph: CallGraphResult,
  callers: ImpactNode[]
): EntryPointImpact[] {
  const entryPoints: EntryPointImpact[] = []
  const callerIds = new Set(callers.map(c => c.id))

  // 1. 페이지 진입점
  for (const page of callGraph.entryPoints.pages) {
    const pageNode = callGraph.nodes.find(n => n.id === page || n.name === page)
    if (pageNode && callerIds.has(pageNode.id)) {
      entryPoints.push({
        id: pageNode.id,
        name: pageNode.name,
        displayName: getFriendlyLabel(pageNode.name),
        type: 'page',
        file: pageNode.file,
        severity: 'high',
        description: `${getFriendlyLabel(pageNode.name)} 페이지가 영향받음`,
      })
    }
  }

  // 2. API 라우트 진입점
  for (const apiRoute of callGraph.entryPoints.apiRoutes) {
    const apiNode = callGraph.nodes.find(n => n.id === apiRoute || n.name === apiRoute)
    if (apiNode && callerIds.has(apiNode.id)) {
      entryPoints.push({
        id: apiNode.id,
        name: apiNode.name,
        displayName: getFriendlyLabel(apiNode.name),
        type: 'api',
        file: apiNode.file,
        severity: 'high',
        description: `${getFriendlyLabel(apiNode.name)} API가 영향받음`,
      })
    }
  }

  // 3. 이벤트 핸들러 진입점
  for (const handler of callGraph.entryPoints.eventHandlers) {
    const handlerNode = callGraph.nodes.find(n => n.id === handler || n.name === handler)
    if (handlerNode && callerIds.has(handlerNode.id)) {
      const severity = determineSeverity(handlerNode)
      entryPoints.push({
        id: handlerNode.id,
        name: handlerNode.name,
        displayName: getFriendlyLabel(handlerNode.name),
        type: 'event',
        file: handlerNode.file,
        severity,
        description: `${getFriendlyLabel(handlerNode.name)} 기능이 동작하지 않음`,
      })
    }
  }

  // 4. 호출자 중 진입점으로 보이는 것들
  for (const caller of callers) {
    const isEntryLike = isEntryPointLike(caller.name)
    if (isEntryLike && !entryPoints.find(e => e.id === caller.id)) {
      entryPoints.push({
        id: caller.id,
        name: caller.name,
        displayName: getFriendlyLabel(caller.name),
        type: classifyEntryPointType(caller.name),
        file: caller.file,
        severity: caller.depth <= 2 ? 'high' : 'medium',
        description: `${getFriendlyLabel(caller.name)} 기능에 영향`,
      })
    }
  }

  return entryPoints.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * 진입점처럼 보이는 함수인지 확인
 */
function isEntryPointLike(name: string): boolean {
  const patterns = [
    /^handle[A-Z]/,      // handleClick, handleSubmit
    /^on[A-Z]/,          // onClick, onSubmit
    /^use[A-Z]/,         // useAuth, useEffect
    /Page$/,             // LoginPage, DashboardPage
    /^(GET|POST|PUT|DELETE|PATCH)$/,  // API handlers
    /Handler$/,          // EventHandler
  ]
  return patterns.some(p => p.test(name))
}

/**
 * 진입점 유형 분류
 */
function classifyEntryPointType(name: string): 'page' | 'api' | 'event' | 'effect' {
  if (/Page$/.test(name)) return 'page'
  if (/^(GET|POST|PUT|DELETE|PATCH)$/.test(name)) return 'api'
  if (/^use[A-Z]/.test(name)) return 'effect'
  return 'event'
}

/**
 * 심각도 결정
 */
function determineSeverity(node: FunctionNode): 'high' | 'medium' | 'low' {
  // 많이 호출되는 함수일수록 중요
  if (node.calledByCount > 5) return 'high'
  if (node.calledByCount > 2) return 'medium'
  return 'low'
}

// ============================================================
// 비개발자용 요약 생성
// ============================================================

/**
 * 비개발자가 이해할 수 있는 요약 생성
 */
export function generateHumanReadableSummary(
  target: ImpactTarget,
  callers: ImpactNode[],
  entryPoints: EntryPointImpact[]
): ImpactSummary {
  const directCallers = callers.filter(c => c.impactLevel === 'direct')
  const indirectCallers = callers.filter(c => c.impactLevel === 'indirect')

  // 영향받는 파일 수
  const affectedFiles = new Set(callers.map(c => c.file))

  // 심각도 결정
  const severity = determineTotalSeverity(entryPoints)

  // 메시지 생성
  const humanReadableMessage = generateMessage(target, directCallers, entryPoints)

  // 권장 조치
  const recommendations = generateRecommendations(target, callers, entryPoints)

  return {
    severity,
    affectedFeaturesCount: entryPoints.length,
    affectedFilesCount: affectedFiles.size,
    affectedFunctions: callers.slice(0, 5).map(c => c.displayName),
    humanReadableMessage,
    recommendations,
  }
}

/**
 * 전체 심각도 결정
 */
function determineTotalSeverity(
  entryPoints: EntryPointImpact[]
): 'critical' | 'high' | 'medium' | 'low' {
  const highCount = entryPoints.filter(e => e.severity === 'high').length

  if (highCount >= 3) return 'critical'
  if (highCount >= 1) return 'high'
  if (entryPoints.length > 0) return 'medium'
  return 'low'
}

/**
 * 비개발자용 메시지 생성
 */
function generateMessage(
  target: ImpactTarget,
  directCallers: ImpactNode[],
  entryPoints: EntryPointImpact[]
): string {
  const icon = getFunctionIcon(target.name)
  const lines: string[] = []

  lines.push(`${icon} ${target.displayName} 삭제 시:`)

  if (entryPoints.length === 0) {
    lines.push('✓ 다른 기능에 영향 없음')
  } else {
    for (const ep of entryPoints.slice(0, 5)) {
      lines.push(`✗ ${ep.description}`)
    }
    if (entryPoints.length > 5) {
      lines.push(`... 그 외 ${entryPoints.length - 5}개 기능`)
    }
  }

  lines.push(`영향받는 기능: ${entryPoints.length}개, 파일: ${new Set(directCallers.map(c => c.file)).size}개`)

  return lines.join('\n')
}

/**
 * 권장 조치 생성
 */
function generateRecommendations(
  target: ImpactTarget,
  callers: ImpactNode[],
  entryPoints: EntryPointImpact[]
): string[] {
  const recommendations: string[] = []

  if (entryPoints.length === 0) {
    recommendations.push('이 함수는 안전하게 삭제할 수 있습니다.')
  } else if (entryPoints.length <= 2) {
    recommendations.push('삭제 전 영향받는 기능을 대체 구현하세요.')
    recommendations.push('관련 테스트를 먼저 업데이트하세요.')
  } else {
    recommendations.push('⚠️ 많은 기능에 영향을 미칩니다. 신중히 검토하세요.')
    recommendations.push('단계적으로 리팩토링하는 것을 권장합니다.')
    recommendations.push('영향받는 파일들의 테스트를 먼저 확인하세요.')
  }

  return recommendations
}

// ============================================================
// 시각화 데이터 생성
// ============================================================

/**
 * 시각화용 데이터 생성
 */
export function generateVisualization(
  target: ImpactTarget,
  callers: ImpactNode[],
  entryPoints: EntryPointImpact[]
): ImpactVisualization {
  const nodes: ImpactVisualization['nodes'] = []
  const edges: ImpactVisualization['edges'] = []

  // 대상 노드
  nodes.push({
    id: target.id,
    label: target.name,
    displayLabel: target.displayName,
    type: 'target',
    severity: 'critical',
  })

  // 호출자 노드
  for (const caller of callers.slice(0, 20)) { // 최대 20개
    const isEntry = entryPoints.find(e => e.id === caller.id)
    nodes.push({
      id: caller.id,
      label: caller.name,
      displayLabel: caller.displayName,
      type: isEntry ? 'entry' : (caller.impactLevel === 'direct' ? 'direct' : 'indirect'),
      severity: isEntry ? isEntry.severity : 'none',
    })

    // 대상으로의 엣지
    if (caller.impactLevel === 'direct') {
      edges.push({
        from: caller.id,
        to: target.id,
        type: 'call',
      })
    }
  }

  // 간접 연결 엣지
  for (const caller of callers) {
    if (caller.callPath.length > 2) {
      const prevIndex = caller.callPath.indexOf(caller.id) - 1
      if (prevIndex >= 0) {
        const prevId = caller.callPath[prevIndex]
        if (callers.find(c => c.id === prevId)) {
          edges.push({
            from: caller.id,
            to: prevId,
            type: 'call',
          })
        }
      }
    }
  }

  // Mermaid 코드 생성
  const mermaidCode = generateMermaidCode(target, callers, entryPoints)

  return {
    nodes,
    edges,
    mermaidCode,
  }
}

/**
 * Mermaid 다이어그램 코드 생성
 */
function generateMermaidCode(
  target: ImpactTarget,
  callers: ImpactNode[],
  entryPoints: EntryPointImpact[]
): string {
  const lines: string[] = ['graph TB']

  // 스타일 정의
  lines.push('  classDef target fill:#ff4444,color:#fff')
  lines.push('  classDef direct fill:#ff8844,color:#fff')
  lines.push('  classDef indirect fill:#ffcc44,color:#000')
  lines.push('  classDef entry fill:#4444ff,color:#fff')

  // 대상 노드
  const targetLabel = target.displayName.replace(/"/g, "'")
  lines.push(`  ${sanitizeId(target.id)}["${targetLabel}"]:::target`)

  // 호출자 노드
  const directCallers = callers.filter(c => c.impactLevel === 'direct').slice(0, 10)
  const indirectCallers = callers.filter(c => c.impactLevel === 'indirect').slice(0, 5)

  for (const caller of directCallers) {
    const isEntry = entryPoints.find(e => e.id === caller.id)
    const label = caller.displayName.replace(/"/g, "'")
    const style = isEntry ? 'entry' : 'direct'
    lines.push(`  ${sanitizeId(caller.id)}["${label}"]:::${style}`)
    lines.push(`  ${sanitizeId(caller.id)} --> ${sanitizeId(target.id)}`)
  }

  for (const caller of indirectCallers) {
    const label = caller.displayName.replace(/"/g, "'")
    lines.push(`  ${sanitizeId(caller.id)}["${label}"]:::indirect`)
  }

  return lines.join('\n')
}

/**
 * Mermaid ID 정규화
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_')
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 노드 타입 분류
 */
function classifyNodeType(node: FunctionNode): ImpactTarget['type'] {
  if (node.type === 'component') return 'component'
  if (node.type === 'hook') return 'hook'
  if (node.type === 'handler') return 'function'
  if (node.name.includes('route') || node.name.match(/^(GET|POST|PUT|DELETE|PATCH)$/)) return 'api'
  return 'function'
}

/**
 * 호출 그래프에서 특정 함수 ID로 영향도 분석
 */
export function analyzeImpactByName(
  callGraph: CallGraphResult,
  functionName: string,
  file?: string,
  maxDepth: number = 5
): ImpactAnalysisResult | null {
  // 이름으로 함수 찾기
  const candidates = callGraph.nodes.filter(n => n.name === functionName)

  if (candidates.length === 0) {
    return null
  }

  // 파일이 지정된 경우 해당 파일의 함수 선택
  let targetNode = candidates[0]
  if (file) {
    const fileMatch = candidates.find(n => n.file.includes(file))
    if (fileMatch) {
      targetNode = fileMatch
    }
  }

  return analyzeImpact(callGraph, targetNode.id, maxDepth)
}
