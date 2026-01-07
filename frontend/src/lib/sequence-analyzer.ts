/**
 * Sequence Analyzer - 시퀀스 다이어그램 생성 로직
 * PRD-0007 v1.4: 바이브 코더를 위한 인과관계 시각화
 *
 * 핵심 기능:
 * - 사용자 행동 → 시스템 반응을 시퀀스로 표현
 * - 비개발자 친화적 라벨 생성
 * - Mermaid 시퀀스 다이어그램 코드 생성
 */

import type {
  SequenceFlow,
  SequenceParticipant,
  SequenceMessage,
  FlowTrigger,
  FlowOutcome,
} from './types/sequence'
import type { CallGraphResult, CallEdge, FunctionNode } from './call-graph-analyzer'
import { getFriendlyLabel, getFunctionIcon } from './function-labels'

// ============================================================
// 참여자 유형별 아이콘
// ============================================================

const PARTICIPANT_ICONS: Record<SequenceParticipant['type'], string> = {
  user: '👤',
  ui: '🖥️',
  logic: '⚙️',
  api: '🌐',
  data: '💾',
  external: '☁️',
}

// ============================================================
// 메인 분석 함수
// ============================================================

/**
 * 시퀀스 흐름 생성
 * 특정 트리거(이벤트 핸들러)에서 시작하는 전체 실행 흐름을 추적
 */
export function generateSequenceFlow(
  callGraph: CallGraphResult,
  triggerFunctionId: string,
  maxDepth: number = 10
): SequenceFlow {
  const triggerNode = callGraph.nodes.find(n => n.id === triggerFunctionId)
  if (!triggerNode) {
    throw new Error(`Trigger function not found: ${triggerFunctionId}`)
  }

  // 1. 트리거 정보 생성
  const trigger = createTrigger(triggerNode)

  // 2. 실행 흐름 추적 (DFS)
  const { participants, messages } = traceExecutionFlow(
    callGraph,
    triggerFunctionId,
    maxDepth
  )

  // 3. 결과(Outcome) 추론
  const outcomes = inferOutcomes(callGraph, messages)

  // 4. 흐름 정보 생성
  const flow: SequenceFlow = {
    id: `flow:${triggerFunctionId}`,
    name: triggerNode.name,
    displayName: getFriendlyLabel(triggerNode.name),
    description: generateFlowDescription(trigger, outcomes),
    trigger,
    participants: [createUserParticipant(), ...participants],
    messages: [createUserTriggerMessage(trigger), ...messages],
    outcomes,
    createdAt: new Date().toISOString(),
  }

  return flow
}

// ============================================================
// 트리거 생성
// ============================================================

/**
 * 트리거 정보 생성
 */
function createTrigger(node: FunctionNode): FlowTrigger {
  return {
    type: inferTriggerType(node.name),
    element: extractElementName(node.name),
    handler: node.name,
    displayLabel: generateTriggerLabel(node.name),
    file: node.file,
    line: node.line,
  }
}

/**
 * 트리거 유형 추론
 */
function inferTriggerType(name: string): FlowTrigger['type'] {
  if (name.includes('Click') || name.includes('click')) return 'click'
  if (name.includes('Submit') || name.includes('submit')) return 'submit'
  if (name.includes('Load') || name.includes('load') || name.includes('Mount')) return 'load'
  if (name.match(/^(GET|POST|PUT|DELETE|PATCH)$/)) return 'api'
  if (name.includes('Effect') || name.startsWith('use')) return 'effect'
  if (name.includes('Timer') || name.includes('Interval')) return 'timer'
  return 'external'
}

/**
 * UI 요소명 추출
 */
function extractElementName(name: string): string | undefined {
  // handleLoginClick → Login
  // onSubmitForm → Form
  const match = name.match(/(?:handle|on)([A-Z][a-z]+)/)
  return match ? match[1] : undefined
}

/**
 * 트리거 라벨 생성
 */
function generateTriggerLabel(name: string): string {
  const element = extractElementName(name)
  const type = inferTriggerType(name)

  if (element) {
    switch (type) {
      case 'click':
        return `${element} 버튼 클릭`
      case 'submit':
        return `${element} 폼 제출`
      case 'load':
        return `${element} 페이지 로드`
      default:
        return `${element} 이벤트`
    }
  }

  return getFriendlyLabel(name)
}

// ============================================================
// 실행 흐름 추적
// ============================================================

/**
 * 실행 흐름 추적 (DFS 기반)
 */
function traceExecutionFlow(
  callGraph: CallGraphResult,
  startId: string,
  maxDepth: number
): { participants: SequenceParticipant[]; messages: SequenceMessage[] } {
  const participants = new Map<string, SequenceParticipant>()
  const messages: SequenceMessage[] = []
  const visited = new Set<string>()
  let messageOrder = 1

  // 시작 노드 추가
  const startNode = callGraph.nodes.find(n => n.id === startId)
  if (startNode) {
    const participant = createParticipant(startNode)
    participants.set(participant.id, participant)
  }

  // DFS 탐색
  function dfs(nodeId: string, depth: number, fromParticipantId: string): void {
    if (depth > maxDepth || visited.has(`${nodeId}:${depth}`)) return

    const outgoingEdges = callGraph.edges.filter(e => e.fromId === nodeId)

    for (const edge of outgoingEdges) {
      visited.add(`${edge.toId}:${depth}`)

      const targetNode = callGraph.nodes.find(n => n.id === edge.toId)
      if (!targetNode) continue

      // 참여자 생성
      const participant = createParticipant(targetNode)
      if (!participants.has(participant.id)) {
        participants.set(participant.id, participant)
      }

      // 메시지 생성
      const message = createMessage(
        messageOrder++,
        fromParticipantId,
        participant.id,
        edge,
        targetNode
      )
      messages.push(message)

      // 재귀 탐색
      dfs(edge.toId, depth + 1, participant.id)

      // API/DB 호출인 경우 리턴 메시지 추가
      if (edge.callType === 'api' || edge.callType === 'db') {
        messages.push(createReturnMessage(messageOrder++, participant.id, fromParticipantId))
      }
    }
  }

  // API 호출 처리
  for (const apiCall of callGraph.apiCalls) {
    const callerNode = callGraph.nodes.find(n => n.id === apiCall.calledFrom)
    if (callerNode) {
      const callerParticipant = participants.get(callerNode.id) || createParticipant(callerNode)
      if (!participants.has(callerParticipant.id)) {
        participants.set(callerParticipant.id, callerParticipant)
      }

      const apiParticipant: SequenceParticipant = {
        id: `api:${apiCall.path}`,
        name: apiCall.path,
        displayName: getFriendlyLabel(apiCall.path),
        type: 'api',
        icon: PARTICIPANT_ICONS.api,
      }
      participants.set(apiParticipant.id, apiParticipant)

      messages.push({
        id: `msg:${messageOrder}`,
        order: messageOrder++,
        from: callerParticipant.id,
        to: apiParticipant.id,
        label: `${apiCall.method} ${apiCall.path}`,
        displayLabel: `${apiCall.method} 요청`,
        type: 'async',
        isAsync: true,
        file: apiCall.file,
        line: apiCall.line,
      })
    }
  }

  // DB 호출 처리
  for (const dbCall of callGraph.dbCalls) {
    const callerNode = callGraph.nodes.find(n => n.id === dbCall.calledFrom)
    if (callerNode) {
      const callerParticipant = participants.get(callerNode.id) || createParticipant(callerNode)
      if (!participants.has(callerParticipant.id)) {
        participants.set(callerParticipant.id, callerParticipant)
      }

      const dbParticipant: SequenceParticipant = {
        id: 'db:supabase',
        name: 'Supabase',
        displayName: '데이터베이스',
        type: 'data',
        icon: PARTICIPANT_ICONS.data,
      }
      if (!participants.has(dbParticipant.id)) {
        participants.set(dbParticipant.id, dbParticipant)
      }

      messages.push({
        id: `msg:${messageOrder}`,
        order: messageOrder++,
        from: callerParticipant.id,
        to: dbParticipant.id,
        label: `${dbCall.type}(${dbCall.table || ''})`,
        displayLabel: getDbOperationLabel(dbCall.type),
        type: 'async',
        isAsync: true,
        file: dbCall.file,
        line: dbCall.line,
      })
    }
  }

  // DFS 시작
  if (startNode) {
    const startParticipant = participants.get(startNode.id)
    if (startParticipant) {
      dfs(startId, 0, startParticipant.id)
    }
  }

  return {
    participants: Array.from(participants.values()),
    messages: messages.sort((a, b) => a.order - b.order),
  }
}

/**
 * DB 작업 라벨 생성
 */
function getDbOperationLabel(type: string): string {
  const labels: Record<string, string> = {
    select: '데이터 조회',
    insert: '데이터 저장',
    update: '데이터 수정',
    delete: '데이터 삭제',
    upsert: '데이터 저장/수정',
    rpc: '함수 호출',
    auth: '인증',
  }
  return labels[type] || '데이터 작업'
}

// ============================================================
// 참여자 생성
// ============================================================

/**
 * 사용자 참여자 생성
 */
function createUserParticipant(): SequenceParticipant {
  return {
    id: 'user',
    name: 'User',
    displayName: '사용자',
    type: 'user',
    icon: PARTICIPANT_ICONS.user,
  }
}

/**
 * 함수 노드로부터 참여자 생성
 */
function createParticipant(node: FunctionNode): SequenceParticipant {
  const type = classifyParticipantType(node)
  return {
    id: node.id,
    name: node.name,
    displayName: getFriendlyLabel(node.name),
    type,
    icon: PARTICIPANT_ICONS[type],
    file: node.file,
    line: node.line,
  }
}

/**
 * 참여자 유형 분류
 */
function classifyParticipantType(node: FunctionNode): SequenceParticipant['type'] {
  // 파일 경로 기반
  if (node.file.includes('/components/') || node.file.includes('.tsx')) {
    return 'ui'
  }
  if (node.file.includes('/api/') || node.file.includes('route.ts')) {
    return 'api'
  }

  // 함수 유형 기반
  if (node.type === 'component') return 'ui'
  if (node.type === 'hook') return 'logic'
  if (node.type === 'handler') return 'api'

  // 이름 기반
  if (node.name.includes('supabase') || node.name.includes('db')) return 'data'

  return 'logic'
}

// ============================================================
// 메시지 생성
// ============================================================

/**
 * 사용자 트리거 메시지 생성
 */
function createUserTriggerMessage(trigger: FlowTrigger): SequenceMessage {
  return {
    id: 'msg:0',
    order: 0,
    from: 'user',
    to: trigger.handler,
    label: trigger.handler,
    displayLabel: trigger.displayLabel,
    type: 'sync',
    isAsync: false,
    file: trigger.file,
    line: trigger.line,
  }
}

/**
 * 호출 메시지 생성
 */
function createMessage(
  order: number,
  fromId: string,
  toId: string,
  edge: CallEdge,
  targetNode: FunctionNode
): SequenceMessage {
  return {
    id: `msg:${order}`,
    order,
    from: fromId,
    to: toId,
    label: targetNode.name,
    displayLabel: getFriendlyLabel(targetNode.name),
    type: edge.isAsync ? 'async' : 'sync',
    isAsync: edge.isAsync,
    file: edge.file,
    line: edge.line,
    description: generateMessageDescription(targetNode),
  }
}

/**
 * 리턴 메시지 생성
 */
function createReturnMessage(
  order: number,
  fromId: string,
  toId: string
): SequenceMessage {
  return {
    id: `msg:${order}`,
    order,
    from: fromId,
    to: toId,
    label: 'response',
    displayLabel: '응답',
    type: 'return',
    isAsync: false,
  }
}

/**
 * 메시지 설명 생성
 */
function generateMessageDescription(node: FunctionNode): string {
  const icon = getFunctionIcon(node.name)
  return `${icon} ${getFriendlyLabel(node.name)} 호출`
}

// ============================================================
// 결과 추론
// ============================================================

/**
 * 흐름 결과 추론
 */
function inferOutcomes(
  callGraph: CallGraphResult,
  messages: SequenceMessage[]
): FlowOutcome[] {
  const outcomes: FlowOutcome[] = []

  // 성공 결과
  outcomes.push({
    type: 'success',
    label: 'success',
    displayLabel: '성공',
    condition: '정상 처리 시',
  })

  // API 호출이 있으면 에러 가능성
  if (callGraph.apiCalls.length > 0) {
    outcomes.push({
      type: 'error',
      label: 'api_error',
      displayLabel: '에러 발생',
      condition: 'API 오류 시',
    })
  }

  // 인증 관련 흐름이면 리다이렉트 가능성
  const hasAuth = messages.some(m =>
    m.label.toLowerCase().includes('auth') ||
    m.label.toLowerCase().includes('login') ||
    m.label.toLowerCase().includes('session')
  )
  if (hasAuth) {
    outcomes.push({
      type: 'redirect',
      label: 'redirect',
      displayLabel: '페이지 이동',
      condition: '인증 성공 시',
    })
  }

  return outcomes
}

// ============================================================
// 흐름 설명 생성
// ============================================================

/**
 * 흐름 전체 설명 생성
 */
function generateFlowDescription(trigger: FlowTrigger, outcomes: FlowOutcome[]): string {
  const triggerDesc = trigger.displayLabel
  const successOutcome = outcomes.find(o => o.type === 'success')

  return `사용자가 ${triggerDesc}하면 시스템이 처리를 수행합니다.`
}

// ============================================================
// Mermaid 코드 생성
// ============================================================

/**
 * Mermaid 시퀀스 다이어그램 코드 생성
 */
export function generateMermaidSequence(flow: SequenceFlow): string {
  const lines: string[] = ['sequenceDiagram']

  // 참여자 정의
  for (const participant of flow.participants) {
    const label = participant.displayName.replace(/"/g, "'")
    lines.push(`    participant ${sanitizeId(participant.id)} as ${participant.icon || ''} ${label}`)
  }

  lines.push('')

  // 메시지
  for (const message of flow.messages) {
    const fromId = sanitizeId(message.from)
    const toId = sanitizeId(message.to)
    const label = message.displayLabel.replace(/"/g, "'")

    if (message.type === 'return') {
      lines.push(`    ${fromId}-->>-${toId}: ${label}`)
    } else if (message.isAsync) {
      lines.push(`    ${fromId}->>+${toId}: ${label}`)
    } else if (message.type === 'self') {
      lines.push(`    ${fromId}->>+${toId}: ${label}`)
    } else {
      lines.push(`    ${fromId}->>+${toId}: ${label}`)
    }
  }

  // 결과
  if (flow.outcomes.length > 0) {
    lines.push('')
    lines.push('    Note right of user: 결과')
    for (const outcome of flow.outcomes) {
      const icon = outcome.type === 'success' ? '✅' : outcome.type === 'error' ? '❌' : '➡️'
      lines.push(`    Note right of user: ${icon} ${outcome.displayLabel}`)
    }
  }

  return lines.join('\n')
}

/**
 * Mermaid ID 정규화
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30)
}

// ============================================================
// 편의 함수
// ============================================================

/**
 * 이벤트 핸들러에서 시퀀스 흐름 생성
 */
export function generateSequenceFromHandler(
  callGraph: CallGraphResult,
  handlerName: string,
  file?: string
): SequenceFlow | null {
  // 핸들러 찾기
  const candidates = callGraph.nodes.filter(n =>
    n.name === handlerName &&
    (n.type === 'handler' || n.name.match(/^(handle|on)[A-Z]/))
  )

  if (candidates.length === 0) {
    return null
  }

  // 파일 지정 시 해당 파일 우선
  let handler = candidates[0]
  if (file) {
    const fileMatch = candidates.find(n => n.file.includes(file))
    if (fileMatch) {
      handler = fileMatch
    }
  }

  return generateSequenceFlow(callGraph, handler.id)
}

/**
 * 모든 진입점에서 시퀀스 흐름 목록 생성
 */
export function generateAllSequenceFlows(
  callGraph: CallGraphResult,
  maxFlows: number = 10
): SequenceFlow[] {
  const flows: SequenceFlow[] = []

  // 이벤트 핸들러에서 흐름 생성
  for (const handler of callGraph.entryPoints.eventHandlers.slice(0, maxFlows)) {
    try {
      const flow = generateSequenceFlow(callGraph, handler)
      flows.push(flow)
    } catch {
      // 흐름 생성 실패 시 건너뜀
    }
  }

  return flows
}
