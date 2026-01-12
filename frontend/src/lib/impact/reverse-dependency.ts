/**
 * Reverse Dependency Analyzer - 역방향 의존성 분석
 * PRD-0008 Phase 2: 영향도 분석
 *
 * 목적: "누가 나를 사용하는가" 분석
 *
 * 핵심 기능:
 * - 역방향 BFS로 호출자 추적
 * - 위험도 계산
 * - 역방향 그래프 생성
 */

// ============================================================
// 타입 정의
// ============================================================

export type RiskLevel = 'high' | 'medium' | 'low'

export interface ImpactCount {
  directCount: number
  indirectCount: number
}

export interface FindCallersOptions {
  maxDepth?: number
}

export interface ForwardEdge {
  from: string
  to: string
}

/**
 * 역방향 의존성 그래프
 * key: 함수/모듈 ID
 * value: 해당 함수를 호출하는 함수들의 ID 배열
 */
export type ReverseDependencyGraph = Record<string, string[]>

// ============================================================
// 메인 함수
// ============================================================

/**
 * 특정 함수를 호출하는 모든 함수 찾기 (BFS)
 * @param graph - 역방향 의존성 그래프 (key: 피호출자, value: 호출자들)
 * @param targetId - 찾을 대상 함수 ID
 * @param options - 탐색 옵션
 * @returns 호출자 ID 배열
 */
export function findCallers(
  graph: ReverseDependencyGraph,
  targetId: string,
  options: FindCallersOptions = {}
): string[] {
  const { maxDepth = 10 } = options

  // 대상이 그래프에 없으면 빈 배열
  if (!graph[targetId]) {
    return []
  }

  const visited = new Set<string>()
  const result: string[] = []
  const queue: Array<{ id: string; depth: number }> = []

  // 직접 호출자들을 큐에 추가
  const directCallers = graph[targetId] || []
  for (const callerId of directCallers) {
    queue.push({ id: callerId, depth: 1 })
  }

  // BFS 탐색
  while (queue.length > 0) {
    const current = queue.shift()!

    // 이미 방문했거나 최대 깊이 초과
    if (visited.has(current.id) || current.depth > maxDepth) {
      continue
    }

    visited.add(current.id)
    result.push(current.id)

    // 이 함수의 호출자들도 탐색
    const nextCallers = graph[current.id] || []
    for (const callerId of nextCallers) {
      if (!visited.has(callerId)) {
        queue.push({ id: callerId, depth: current.depth + 1 })
      }
    }
  }

  return result
}

/**
 * 영향도에 따른 위험도 계산
 * @param impact - 직접/간접 호출자 수
 * @returns 위험도 레벨
 */
export function calculateRisk(impact: ImpactCount): RiskLevel {
  const { directCount, indirectCount } = impact
  const totalCount = directCount + indirectCount

  // 직접 호출자가 5개 이상이면 높은 위험
  if (directCount >= 5) {
    return 'high'
  }

  // 총 영향이 10개 이상이면 높은 위험
  if (totalCount >= 10) {
    return 'high'
  }

  // 직접 호출자가 2개 이상이거나 총 영향이 3개 이상이면 중간 위험
  if (directCount >= 2 || totalCount >= 3) {
    return 'medium'
  }

  return 'low'
}

/**
 * 순방향 엣지를 역방향 그래프로 변환
 * @param forwardEdges - 순방향 호출 관계 (A가 B를 호출)
 * @returns 역방향 그래프 (B가 A에 의해 호출됨)
 */
export function buildReverseDependencyGraph(
  forwardEdges: ForwardEdge[]
): ReverseDependencyGraph {
  const graph: ReverseDependencyGraph = {}

  for (const edge of forwardEdges) {
    const { from, to } = edge

    // to가 from에 의해 호출됨
    if (!graph[to]) {
      graph[to] = []
    }

    // 중복 방지
    if (!graph[to].includes(from)) {
      graph[to].push(from)
    }
  }

  return graph
}

// ============================================================
// 고급 분석 함수
// ============================================================

/**
 * 영향 범위 분석 결과
 */
export interface ImpactAnalysis {
  targetId: string
  directCallers: string[]
  indirectCallers: string[]
  totalAffected: number
  riskLevel: RiskLevel
  affectedByDepth: Record<number, string[]>
}

/**
 * 전체 영향 범위 분석
 * @param graph - 역방향 의존성 그래프
 * @param targetId - 대상 함수 ID
 * @param maxDepth - 최대 탐색 깊이
 */
export function analyzeImpactScope(
  graph: ReverseDependencyGraph,
  targetId: string,
  maxDepth: number = 5
): ImpactAnalysis {
  const directCallers: string[] = graph[targetId] || []
  const visited = new Set<string>()
  const affectedByDepth: Record<number, string[]> = {}

  // 직접 호출자 기록
  affectedByDepth[1] = [...directCallers]
  for (const caller of directCallers) {
    visited.add(caller)
  }

  // BFS로 간접 호출자 탐색
  let currentDepth = 1
  let currentLevel = [...directCallers]

  while (currentDepth < maxDepth && currentLevel.length > 0) {
    const nextLevel: string[] = []
    currentDepth++

    for (const callerId of currentLevel) {
      const nextCallers = graph[callerId] || []
      for (const nextCaller of nextCallers) {
        if (!visited.has(nextCaller)) {
          visited.add(nextCaller)
          nextLevel.push(nextCaller)
        }
      }
    }

    if (nextLevel.length > 0) {
      affectedByDepth[currentDepth] = nextLevel
    }
    currentLevel = nextLevel
  }

  // 간접 호출자 (깊이 2 이상)
  const indirectCallers: string[] = []
  for (const [depth, callers] of Object.entries(affectedByDepth)) {
    if (parseInt(depth) > 1) {
      indirectCallers.push(...callers)
    }
  }

  const riskLevel = calculateRisk({
    directCount: directCallers.length,
    indirectCount: indirectCallers.length,
  })

  return {
    targetId,
    directCallers,
    indirectCallers,
    totalAffected: directCallers.length + indirectCallers.length,
    riskLevel,
    affectedByDepth,
  }
}

/**
 * 진입점(Entry Point)까지의 경로 찾기
 * @param graph - 역방향 의존성 그래프
 * @param targetId - 대상 함수 ID
 * @param entryPoints - 진입점 ID 목록 (페이지, API 핸들러 등)
 */
export function findPathsToEntryPoints(
  graph: ReverseDependencyGraph,
  targetId: string,
  entryPoints: Set<string>,
  maxDepth: number = 10
): string[][] {
  const paths: string[][] = []
  const visited = new Set<string>()

  function dfs(currentId: string, path: string[], depth: number): void {
    if (depth > maxDepth) return
    if (visited.has(currentId)) return

    visited.add(currentId)
    path.push(currentId)

    // 진입점에 도달
    if (entryPoints.has(currentId)) {
      paths.push([...path])
    }

    // 호출자들 탐색
    const callers = graph[currentId] || []
    for (const caller of callers) {
      dfs(caller, path, depth + 1)
    }

    path.pop()
    visited.delete(currentId)
  }

  dfs(targetId, [], 0)
  return paths
}
