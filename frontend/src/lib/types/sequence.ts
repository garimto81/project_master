/**
 * 시퀀스 다이어그램 및 인과관계 시각화 타입 정의
 * PRD-0007 v1.4: 바이브 코더를 위한 인과관계 시각화
 */

// ============================================================
// 시퀀스 다이어그램 타입
// ============================================================

/**
 * 시퀀스 다이어그램의 참여자 (Actor)
 */
export interface SequenceParticipant {
  id: string
  name: string
  displayName: string  // 비개발자용 한글 라벨
  type: 'user' | 'ui' | 'logic' | 'api' | 'data' | 'external'
  icon?: string        // 아이콘 (예: 👤, 🖥️, ⚙️, 🌐, 💾)
  file?: string        // 소스 파일 경로
  line?: number
}

/**
 * 시퀀스 다이어그램의 메시지 (화살표)
 */
export interface SequenceMessage {
  id: string
  order: number         // 실행 순서
  from: string          // 참여자 ID
  to: string            // 참여자 ID
  label: string         // 기술 라벨 (함수명)
  displayLabel: string  // 비개발자용 한글 라벨
  type: 'sync' | 'async' | 'return' | 'self'
  isAsync: boolean
  file?: string
  line?: number
  description?: string  // 상세 설명
}

/**
 * 시퀀스 흐름 정의
 */
export interface SequenceFlow {
  id: string
  name: string           // 기술명 (예: handleLogin)
  displayName: string    // 비개발자용 (예: "로그인 처리")
  description: string    // 상세 설명
  trigger: FlowTrigger
  participants: SequenceParticipant[]
  messages: SequenceMessage[]
  outcomes: FlowOutcome[]
  createdAt: string
}

/**
 * 흐름의 시작점 (트리거)
 */
export interface FlowTrigger {
  type: 'click' | 'submit' | 'load' | 'api' | 'effect' | 'timer' | 'external'
  element?: string       // UI 요소명
  handler: string        // 핸들러 함수명
  displayLabel: string   // 비개발자용 라벨 (예: "로그인 버튼 클릭")
  file: string
  line: number
}

/**
 * 흐름의 결과
 */
export interface FlowOutcome {
  type: 'success' | 'error' | 'redirect' | 'update'
  label: string          // 기술 라벨
  displayLabel: string   // 비개발자용 라벨
  condition?: string     // 조건 (예: "인증 성공 시")
}

// ============================================================
// 영향도 분석 타입
// ============================================================

/**
 * 영향도 분석 결과
 */
export interface ImpactAnalysisResult {
  target: ImpactTarget
  affectedCallers: ImpactNode[]
  affectedEntryPoints: EntryPointImpact[]
  summary: ImpactSummary
  visualizationData: ImpactVisualization
}

/**
 * 분석 대상
 */
export interface ImpactTarget {
  id: string
  name: string
  displayName: string
  type: 'function' | 'component' | 'hook' | 'module' | 'api'
  file: string
  line: number
}

/**
 * 영향받는 노드
 */
export interface ImpactNode {
  id: string
  name: string
  displayName: string
  file: string
  line: number
  depth: number          // 대상으로부터의 거리 (1=직접 호출, 2=간접 호출...)
  impactLevel: 'direct' | 'indirect'
  callPath: string[]     // 호출 경로
}

/**
 * 영향받는 진입점
 */
export interface EntryPointImpact {
  id: string
  name: string
  displayName: string    // 비개발자용 (예: "로그인 버튼")
  type: 'page' | 'api' | 'event' | 'effect'
  file: string
  severity: 'high' | 'medium' | 'low'
  description: string    // 영향 설명 (예: "로그인 기능이 동작하지 않음")
}

/**
 * 영향도 요약 (비개발자용)
 */
export interface ImpactSummary {
  severity: 'critical' | 'high' | 'medium' | 'low'
  affectedFeaturesCount: number
  affectedFilesCount: number
  affectedFunctions: string[]
  humanReadableMessage: string  // 비개발자용 메시지
  recommendations: string[]     // 권장 조치
}

/**
 * 영향도 시각화 데이터
 */
export interface ImpactVisualization {
  nodes: Array<{
    id: string
    label: string
    displayLabel: string
    type: 'target' | 'direct' | 'indirect' | 'entry'
    severity: 'critical' | 'high' | 'medium' | 'low' | 'none'
    x?: number
    y?: number
  }>
  edges: Array<{
    from: string
    to: string
    type: 'call' | 'depend'
  }>
  mermaidCode?: string
}

// ============================================================
// 데이터 흐름 추적 타입
// ============================================================

/**
 * 데이터 흐름 추적 결과
 */
export interface DataFlowResult {
  target: DataTarget
  sources: DataSource[]
  transformations: DataTransformation[]
  destinations: DataDestination[]
  story: DataFlowStory
  visualizationData: DataFlowVisualization
}

/**
 * 추적 대상 데이터
 */
export interface DataTarget {
  id: string
  name: string           // 변수명/필드명
  displayName: string    // 비개발자용 (예: "사용자 이메일")
  type: 'variable' | 'parameter' | 'property' | 'state' | 'props'
  file: string
  line: number
}

/**
 * 데이터 출처
 */
export interface DataSource {
  id: string
  type: 'user-input' | 'api-response' | 'database' | 'local-storage' | 'url-param' | 'computed' | 'constant'
  name: string
  displayName: string    // 비개발자용 (예: "로그인 폼 입력")
  file?: string
  line?: number
  description: string
}

/**
 * 데이터 변환
 */
export interface DataTransformation {
  id: string
  order: number
  type: 'validate' | 'transform' | 'filter' | 'map' | 'merge' | 'split' | 'format'
  functionName: string
  displayLabel: string   // 비개발자용 (예: "이메일 형식 검증")
  file: string
  line: number
  inputType?: string
  outputType?: string
}

/**
 * 데이터 목적지
 */
export interface DataDestination {
  id: string
  type: 'ui-display' | 'api-request' | 'database' | 'local-storage' | 'state' | 'log'
  name: string
  displayName: string    // 비개발자용 (예: "프로필 페이지 표시")
  file?: string
  line?: number
  description: string
}

/**
 * 데이터 흐름 스토리 (비개발자용)
 */
export interface DataFlowStory {
  title: string          // 예: "사용자 이메일 데이터 추적"
  steps: DataFlowStep[]
  summary: string        // 전체 요약
}

/**
 * 데이터 흐름 스토리 단계
 */
export interface DataFlowStep {
  order: number
  icon: string           // 예: 1️⃣, 2️⃣, 3️⃣...
  label: string          // 비개발자용 설명
  technicalDetail?: string
}

/**
 * 데이터 흐름 시각화 데이터
 */
export interface DataFlowVisualization {
  nodes: Array<{
    id: string
    label: string
    displayLabel: string
    type: 'source' | 'transform' | 'destination' | 'target'
    x?: number
    y?: number
  }>
  edges: Array<{
    from: string
    to: string
    label?: string
  }>
  mermaidCode?: string
}

// ============================================================
// API 요청/응답 타입
// ============================================================

/**
 * 시퀀스 분석 요청
 */
export interface SequenceAnalyzeRequest {
  repo: string
  branch?: string
  trigger: {
    type: FlowTrigger['type']
    target: string       // 함수명 또는 파일:라인
  }
  maxDepth?: number
}

/**
 * 시퀀스 분석 응답
 */
export interface SequenceAnalyzeResponse {
  success: boolean
  flow?: SequenceFlow
  error?: string
  analysisTimeMs?: number
}

/**
 * 영향도 분석 요청
 */
export interface ImpactAnalyzeRequest {
  repo: string
  branch?: string
  target: {
    type: ImpactTarget['type']
    name: string
    file?: string
  }
  maxDepth?: number
}

/**
 * 영향도 분석 응답
 */
export interface ImpactAnalyzeResponse {
  success: boolean
  result?: ImpactAnalysisResult
  error?: string
  analysisTimeMs?: number
}

/**
 * 데이터 흐름 추적 요청
 */
export interface DataTraceRequest {
  repo: string
  branch?: string
  target: {
    name: string         // 변수명
    file: string
    line: number
  }
  direction?: 'backward' | 'forward' | 'both'
}

/**
 * 데이터 흐름 추적 응답
 */
export interface DataTraceResponse {
  success: boolean
  result?: DataFlowResult
  error?: string
  analysisTimeMs?: number
}

// ============================================================
// 뷰 모드 타입
// ============================================================

/**
 * 시각화 뷰 모드
 */
export type ViewMode =
  | 'layer'       // 기존 레이어 뷰
  | 'sequence'    // 시퀀스 다이어그램
  | 'impact'      // 영향도 분석
  | 'data-trace'  // 데이터 흐름 추적

/**
 * 뷰 모드 설정
 */
export interface ViewModeConfig {
  mode: ViewMode
  label: string
  icon: string
  description: string
  available: boolean
}

/**
 * 뷰 모드 목록
 */
export const VIEW_MODE_CONFIGS: ViewModeConfig[] = [
  {
    mode: 'layer',
    label: '레이어 뷰',
    icon: '📊',
    description: '코드 구조를 레이어별로 표시',
    available: true,
  },
  {
    mode: 'sequence',
    label: '시퀀스 뷰',
    icon: '📖',
    description: '기능의 실행 흐름을 시간순으로 표시',
    available: true,
  },
  {
    mode: 'impact',
    label: '영향도 분석',
    icon: '🔴',
    description: '함수 삭제/수정 시 영향받는 기능 분석',
    available: true,
  },
  {
    mode: 'data-trace',
    label: '데이터 추적',
    icon: '📊',
    description: '데이터의 출처와 사용처 추적',
    available: true,
  },
]
