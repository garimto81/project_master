/**
 * 공유 타입 정의
 * 시각화, 분석, 컴포넌트에서 사용하는 공통 타입
 */

import { LayerType } from './colors'

// 레이어 정보
export interface Layer {
  name: string
  type: LayerType
  modules: ModuleInfo[]
  description?: string
}

// 모듈 정보
export interface ModuleInfo {
  name: string
  path: string
  type: LayerType
  description?: string
  functions?: FunctionInfo[]
  dependencies?: string[]
  dependents?: string[]
  issueCount?: number
  riskLevel?: 'low' | 'medium' | 'high'
}

// 함수 정보
export interface FunctionInfo {
  name: string
  path: string
  signature?: string
  description?: string
  complexity?: number
  isAsync?: boolean
  isExported?: boolean
}

// 연결 정보 (의존성 그래프용)
export interface Connection {
  from: string
  to: string
  type: 'import' | 'export' | 'call' | 'reference'
  imports?: string[]
  weight?: number
}

// 위험 지점
export interface RiskPoint {
  path: string
  type: 'try-catch' | 'null-check' | 'error-boundary' | 'async-await' | 'type-assertion'
  line?: number
  severity: 'low' | 'medium' | 'high'
  description?: string
}

// 순환 의존성
export interface CircularDependency {
  cycle: string[]
  severity: 'warning' | 'error'
  suggestion?: string
}

// 분석 결과
export interface AnalysisResult {
  layers: Layer[]
  connections: Connection[]
  circularDependencies: CircularDependency[]
  riskPoints: RiskPoint[]
  stats: AnalysisStats
  mermaidCode?: string
}

// 분석 통계
export interface AnalysisStats {
  totalFiles: number
  totalModules: number
  totalFunctions: number
  totalDependencies: number
  circularCount: number
  riskCount: number
  layerCoverage: Record<LayerType, number>
}

// API 응답 타입
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 시각화 상태
export interface VisualizationState {
  currentLevel: 0 | 1 | 2 | 3
  selectedRepo?: string
  selectedModule?: string
  selectedFunction?: string
  zoom: number
  pan: { x: number; y: number }
}

// AI 모델 정보
export interface AIModel {
  id: string
  name: string
  description: string
  available: boolean
  capabilities?: string[]
  pricing?: {
    inputCost: number
    outputCost: number
    unit: 'per_1k_tokens' | 'per_1m_tokens'
  }
}

// AI 해결 요청
export interface AIResolveRequest {
  model: string
  issue_id: number
  issue_title: string
  prompt?: string
}

// AI 해결 응답
export interface AIResolveResponse {
  success: boolean
  model_used: string
  code: string
  output: string
  message: string
  usage?: {
    inputTokens: number
    outputTokens: number
    estimatedCost?: number
  }
}

// GitHub 레포지토리 정보
export interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  open_issues_count: number
  stargazers_count: number
  updated_at: string
}

// GitHub 레포지토리 상세 정보
export interface RepositoryDetail extends Repository {
  html_url: string
  clone_url: string
  default_branch: string
  archived: boolean
  forks_count: number
  size: number
  contributors_count: number
  branches: string[]
  recent_commits: Array<{
    sha: string
    message: string
    author: string
    date: string
  }>
  languages: Record<string, number>
}

// CLI 상태
export interface CLIStatus {
  claude: boolean
  codex: boolean
  gemini: boolean
  qwen: boolean
}
