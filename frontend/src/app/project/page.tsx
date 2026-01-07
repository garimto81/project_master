'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { getAvailableModels } from '@/lib/api'
import AIRedirectModal from '@/components/ai-redirect/AIRedirectModal'
import AnalysisProgressBar, { type AnalysisStage } from '@/components/visualization/AnalysisProgressBar'
import { useLLMAnalysis } from '@/lib/hooks/useLLMAnalysis'
import type { FileAnalysis, LayerType, FunctionInfo } from '@/lib/ast-analyzer'

// ReactFlowDiagram 동적 로드 (SSR 비활성화)
const ReactFlowDiagram = dynamic(
  () => import('@/components/visualization/ReactFlowDiagram'),
  { ssr: false }
)

interface Issue {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  labels: string[]
  body?: string
}

interface AIModel {
  id: string
  name: string
  description: string
  status: 'available' | 'unavailable'
  mode: 'auto' | 'redirect'
  webUrl?: string
}

interface GitHubIssueResponse {
  id: number
  number: number
  title: string
  state: string
  labels: Array<string | { name: string }>
}

interface SSEMessage {
  type: 'progress' | 'chunk' | 'complete' | 'error'
  stage?: 'analyzing' | 'context' | 'generating' | 'finalizing' | 'ready'
  percent?: number
  message?: string
  content?: string
  code?: string
  output?: string
  resolveId?: string
  model_used?: string
}

// 다이어그램 관련 인터페이스
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
}

interface AnalyzeData {
  repo: string
  data_flow: {
    entry_points: string[]
    layers: Layer[]
    connections?: Connection[]
  }
  risk_points: Array<{ location: string; function: string; risk: 'high' | 'medium' | 'low'; reason: string }>
  issues: Array<{ number: number; title: string; related_layer?: string }>
  mermaid_code: string
}

// 기본 모델 (API 연결 실패 시 사용 - 리다이렉트 모드)
const DEFAULT_MODELS: AIModel[] = [
  { id: 'claude', name: 'Claude', description: 'Anthropic Claude', status: 'available', mode: 'redirect', webUrl: 'https://claude.ai/new' },
  { id: 'codex', name: 'GPT Codex', description: 'OpenAI GPT-4o', status: 'available', mode: 'redirect', webUrl: 'https://chatgpt.com/' },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini', status: 'available', mode: 'redirect', webUrl: 'https://gemini.google.com/' },
  { id: 'qwen', name: 'Qwen', description: 'Alibaba Qwen', status: 'available', mode: 'redirect', webUrl: 'https://tongyi.aliyun.com/qianwen/' },
]

// E2E 테스트용 Mock 이슈 데이터
const MOCK_ISSUES: Issue[] = [
  { id: 1, number: 1, title: '테스트 이슈 #1', state: 'open', labels: ['bug'], body: '버그 수정 필요' },
  { id: 2, number: 2, title: '테스트 이슈 #2', state: 'open', labels: ['enhancement'], body: '기능 개선' },
  { id: 3, number: 3, title: '닫힌 이슈 #3', state: 'closed', labels: [] },
]

// 테스트 모드용 자동 모드 모델 (MOCK_AI_API=true일 때)
const TEST_MODE_MODELS: AIModel[] = [
  { id: 'claude', name: 'Claude', description: 'Anthropic Claude', status: 'available', mode: 'auto' },
  { id: 'codex', name: 'GPT Codex', description: 'OpenAI GPT-4o', status: 'available', mode: 'auto' },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini', status: 'available', mode: 'auto' },
  { id: 'qwen', name: 'Qwen', description: 'Alibaba Qwen', status: 'available', mode: 'auto' },
]

// E2E 테스트용 Mock 다이어그램 데이터
const MOCK_DIAGRAM_DATA: AnalyzeData = {
  repo: 'test/repo',
  data_flow: {
    entry_points: ['src/index.tsx'],
    layers: [
      { name: 'ui', displayName: '화면 (UI)', modules: ['LoginPage', 'Dashboard'], description: '사용자 화면' },
      { name: 'logic', displayName: '처리 (Logic)', modules: ['authService', 'utils'], description: '비즈니스 로직' },
      { name: 'server', displayName: '서버 (API)', modules: ['authRoute', 'userRoute'], description: 'API 엔드포인트' },
    ],
    connections: [
      { from: 'ui', to: 'logic', type: 'call', label: '이벤트 처리' },
      { from: 'logic', to: 'server', type: 'fetch', label: 'API 호출' },
    ],
  },
  risk_points: [],
  issues: [],
  mermaid_code: 'flowchart TB\n  UI --> Logic --> Server',
}

/**
 * AnalyzeData를 FileAnalysis[]로 변환
 * ReactFlowDiagram이 기대하는 형식으로 변환
 */
function convertAnalyzeDataToFileAnalysis(data: AnalyzeData): FileAnalysis[] {
  const files: FileAnalysis[] = []

  // 레이어 이름을 LayerType으로 매핑
  const layerMap: Record<string, LayerType> = {
    ui: 'ui',
    logic: 'logic',
    server: 'api',
    data: 'data',
    lib: 'lib',
  }

  for (const layer of data.data_flow.layers) {
    const layerType = layerMap[layer.name] || 'unknown'

    // 각 모듈을 파일로 변환
    for (const moduleName of layer.modules) {
      // 모듈 이름에서 함수 정보 생성
      const isComponent = /^[A-Z]/.test(moduleName) && !moduleName.includes('Route')
      const isHook = moduleName.startsWith('use')
      const isApiRoute = layer.name === 'server' || moduleName.includes('Route')

      const functionInfo: FunctionInfo = {
        id: `${moduleName}-main`,
        name: moduleName,
        file: `src/${layer.name}/${moduleName}.tsx`,
        line: 1,
        type: isComponent ? 'component' : isHook ? 'hook' : 'function',
        isExported: true,
        isAsync: isApiRoute,
        parameters: [],
        returnType: null,
      }

      files.push({
        path: `src/${layer.name}/${moduleName}.tsx`,
        layer: layerType,
        functions: [functionInfo],
        classes: [],
        exports: [{ name: moduleName, type: isComponent ? 'function' : 'function', line: 1 }],
        imports: [],
        hasJsx: isComponent,
        hasSupabase: layer.name === 'data',
        isApiRoute,
      })
    }
  }

  return files
}

function ProjectContent() {
  const searchParams = useSearchParams()
  const repoParam = searchParams.get('repo') || ''
  const testMode = searchParams.get('test') === 'true'
  const redirectTestMode = searchParams.get('redirect') === 'true' // 리다이렉트 모드 테스트용
  const repoName = repoParam.split('/').pop() || '프로젝트'

  const [issues, setIssues] = useState<Issue[]>([])
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('claude')
  const [isResolving, setIsResolving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStage, setProgressStage] = useState<string>('')
  const [usedModel, setUsedModel] = useState<string | null>(null)
  const [aiModels, setAiModels] = useState<AIModel[]>(DEFAULT_MODELS)
  const [resolveResult, setResolveResult] = useState<{ code: string; output: string; resolveId?: string } | null>(null)
  const [streamedCode, setStreamedCode] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [showRedirectModal, setShowRedirectModal] = useState(false)

  // Progress Bar 상태
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('fetching')
  const [analysisPercent, setAnalysisPercent] = useState(0)
  const [analysisMessage, setAnalysisMessage] = useState('')

  // Issue #61, #62: LLM 분석
  const {
    isAnalyzing: isLLMAnalyzing,
    llmStatus,
    moduleAnalyses,
    checkLLMStatus,
    analyzeModuleTitles,
  } = useLLMAnalysis()

  const abortControllerRef = useRef<AbortController | null>(null)

  // SWR fetcher 함수
  const diagramFetcher = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || `분석 실패 (HTTP ${response.status})`)
    }
    const data = await response.json()
    if (!data || !data.data_flow || !data.data_flow.layers) {
      throw new Error('분석 데이터가 불완전합니다')
    }
    return data as AnalyzeData
  }

  // SWR을 사용한 다이어그램 데이터 로딩 (자동 캐싱)
  const {
    data: swrDiagramData,
    error: diagramError,
    isLoading: diagramLoading,
  } = useSWR<AnalyzeData>(
    testMode || !repoParam
      ? null
      : `/api/logic-flow/analyze?repo=${encodeURIComponent(repoParam)}&depth=medium&include_risk=true`,
    diagramFetcher,
    {
      revalidateOnFocus: false,  // 포커스 시 재검증 안함
      revalidateOnReconnect: false,  // 재연결 시 재검증 안함
      dedupingInterval: 60000,  // 1분간 중복 요청 방지
      errorRetryCount: 1,  // 에러 시 1회만 재시도
    }
  )

  // 테스트 모드와 실제 데이터 병합
  const diagramData = testMode ? MOCK_DIAGRAM_DATA : swrDiagramData

  const openIssues = issues.filter(i => i.state === 'open')
  const closedIssues = issues.filter(i => i.state === 'closed')

  // GitHub 이슈 목록 가져오기 (테스트 모드에서는 mock 데이터 사용)
  useEffect(() => {
    if (testMode) {
      setIssues(MOCK_ISSUES)
      // redirectTestMode면 리다이렉트 모델, 아니면 자동 모드 모델 사용
      setAiModels(redirectTestMode ? DEFAULT_MODELS : TEST_MODE_MODELS)
      return
    }

    if (!repoParam) return

    const fetchIssues = async () => {
      try {
        const res = await fetch(`/api/issues?repo=${encodeURIComponent(repoParam)}`)
        if (res.ok) {
          const data = await res.json()
          setIssues(data.issues?.map((issue: GitHubIssueResponse) => ({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            state: issue.state as 'open' | 'closed',
            labels: issue.labels?.map((l) => typeof l === 'string' ? l : l.name) || [],
          })) || [])
        }
      } catch (err) {
        console.error('Failed to fetch issues:', err)
      }
    }
    fetchIssues()
  }, [repoParam, testMode, redirectTestMode])

  // API에서 모델 목록 가져오기 (선택적)
  useEffect(() => {
    if (testMode) return // 테스트 모드에서는 TEST_MODE_MODELS 사용

    const fetchModels = async () => {
      try {
        const models = await getAvailableModels()
        setAiModels(models.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
          status: m.available ? 'available' as const : 'unavailable' as const,
          mode: ('mode' in m ? (m as { mode: 'auto' | 'redirect' }).mode : 'redirect') as 'auto' | 'redirect',
          webUrl: 'webUrl' in m ? (m as { webUrl?: string }).webUrl : undefined,
        })))
      } catch {
        // API 실패 시 기본 모델 사용 (리다이렉트 모드)
        setAiModels(DEFAULT_MODELS)
      }
    }
    fetchModels()
  }, [testMode])

  // Issue #61, #62: LLM 상태 확인
  useEffect(() => {
    checkLLMStatus()
  }, [checkLLMStatus])

  // Issue #61, #62: 다이어그램 데이터 로드 시 LLM 분석 트리거
  useEffect(() => {
    if (diagramData && llmStatus?.available && repoParam) {
      // 모든 레이어의 모듈을 수집
      const allFiles = diagramData.data_flow.layers.flatMap(layer =>
        layer.modules.slice(0, 3).map(mod => ({
          path: `src/${mod}.tsx`,
          layer: layer.name,
        }))
      ).slice(0, 10) // 최대 10개만 분석

      if (allFiles.length > 0) {
        analyzeModuleTitles(repoParam, allFiles)
      }
    }
  }, [diagramData, llmStatus, repoParam, analyzeModuleTitles])

  // Progress Bar 업데이트 (로딩 중일 때만)
  useEffect(() => {
    if (!diagramLoading) return

    setAnalysisStage('fetching')
    setAnalysisPercent(0)
    setAnalysisMessage('GitHub에서 파일 목록 가져오는 중...')

    // 진행률 시뮬레이션
    const progressInterval = setInterval(() => {
      setAnalysisPercent((prev) => {
        if (prev < 10) {
          setAnalysisStage('fetching')
          setAnalysisMessage('GitHub에서 파일 목록 가져오는 중...')
          return prev + 2
        } else if (prev < 20) {
          setAnalysisStage('scanning')
          setAnalysisMessage('분석할 파일 찾는 중...')
          return prev + 2
        } else if (prev < 80) {
          setAnalysisStage('analyzing')
          setAnalysisMessage('코드 구조 분석 중...')
          return prev + 1
        } else if (prev < 95) {
          setAnalysisStage('building')
          setAnalysisMessage('다이어그램 생성 중...')
          return prev + 0.5
        }
        return prev
      })
    }, 200)

    return () => clearInterval(progressInterval)
  }, [diagramLoading])

  // 완료 상태 업데이트
  useEffect(() => {
    if (diagramData) {
      setAnalysisStage('complete')
      setAnalysisPercent(100)
      setAnalysisMessage('분석 완료!')
    }
  }, [diagramData])

  // 에러 상태 업데이트
  useEffect(() => {
    if (diagramError) {
      setAnalysisStage('error')
      setAnalysisPercent(0)
    }
  }, [diagramError])

  // SSE 스트리밍 처리
  const handleSSEResolve = useCallback(async () => {
    if (!selectedIssue) return

    setIsResolving(true)
    setProgress(0)
    setProgressStage('')
    setUsedModel(selectedModel)
    setError(null)
    setResolveResult(null)
    setStreamedCode('')

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      // 테스트 모드에서는 X-Test-Mode 헤더 추가
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (testMode) {
        headers['X-Test-Mode'] = 'true'
      }

      const response = await fetch('/api/ai/resolve', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: selectedModel,
          issue_id: selectedIssue.id,
          issue_title: selectedIssue.title,
          issue_body: selectedIssue.body,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('SSE 스트림 시작 실패')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('스트림 리더 생성 실패')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedCode = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: SSEMessage = JSON.parse(line.slice(6))

              switch (data.type) {
                case 'progress':
                  setProgress(data.percent || 0)
                  setProgressStage(data.message || '')
                  break
                case 'chunk':
                  if (data.content) {
                    accumulatedCode += data.content
                    setStreamedCode(accumulatedCode)
                  }
                  break
                case 'complete':
                  setProgress(100)
                  setResolveResult({
                    code: data.code || accumulatedCode,
                    output: data.output || '',
                    resolveId: data.resolveId,
                  })
                  setUsedModel(data.model_used || selectedModel)
                  setIsResolving(false)
                  break
                case 'error':
                  setError(data.message || 'AI 호출 실패')
                  setIsResolving(false)
                  break
              }
            } catch {
              // JSON 파싱 오류 무시
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // 취소된 요청은 무시
      }
      console.error('SSE error:', err)
      setError(err instanceof Error ? err.message : 'SSE 연결 실패')
      setIsResolving(false)
    }
  }, [selectedIssue, selectedModel, testMode])

  const handleAIResolve = async () => {
    if (!selectedIssue) return

    const currentModel = aiModels.find(m => m.id === selectedModel)

    // 리다이렉트 모드: 모달 표시
    if (currentModel?.mode === 'redirect') {
      setShowRedirectModal(true)
      return
    }

    // 자동 모드: SSE 스트리밍 호출
    await handleSSEResolve()
  }

  // 승인 처리
  const handleApprove = async () => {
    if (!resolveResult?.resolveId) {
      // resolveId가 없는 경우 (리다이렉트 모드 등)
      setResolveResult(null)
      setProgress(0)
      return
    }

    try {
      const response = await fetch('/api/ai/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolveId: resolveResult.resolveId }),
      })

      if (response.ok) {
        // 승인 완료
        setResolveResult(null)
        setProgress(0)
        setStreamedCode('')
      }
    } catch (err) {
      console.error('Approve error:', err)
    }
  }

  // 거부 처리
  const handleReject = async () => {
    if (!resolveResult?.resolveId) {
      // resolveId가 없는 경우 (리다이렉트 모드 등)
      setResolveResult(null)
      setProgress(0)
      return
    }

    try {
      const response = await fetch('/api/ai/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolveId: resolveResult.resolveId }),
      })

      if (response.ok) {
        // 거부 완료 - 상태 초기화
        setResolveResult(null)
        setProgress(0)
        setStreamedCode('')
      }
    } catch (err) {
      console.error('Reject error:', err)
    }
  }

  // 리다이렉트 모달에서 결과 받기
  const handleRedirectResult = (result: { code: string; output: string }) => {
    setResolveResult(result)
    setProgress(100)
    setUsedModel(selectedModel)
  }

  return (
    <main className="project-page" data-testid="project-page">
      <header data-testid="project-header">
        <h1>{repoName}</h1>
        <Link href="/" data-testid="back-btn">← 돌아가기</Link>
      </header>

      <div className="layout" style={{ display: 'flex', gap: '20px' }}>
        <section className="issue-board" data-testid="issue-board" style={{ flex: 1 }}>
          <h2>이슈 보드</h2>

          <details open data-testid="open-issues-accordion">
            <summary>열린 이슈 ({openIssues.length})</summary>
            <ul data-testid="open-issues-list">
              {openIssues.map(issue => (
                <li
                  key={issue.id}
                  data-testid={`issue-${issue.number}`}
                  onClick={() => setSelectedIssue(issue)}
                  style={{ cursor: 'pointer', padding: '8px', border: '1px solid #ccc', margin: '4px 0' }}
                >
                  #{issue.number} {issue.title}
                  {issue.labels.map(l => <span key={l} className="label">[{l}]</span>)}
                </li>
              ))}
            </ul>
          </details>

          <details data-testid="closed-issues-accordion">
            <summary>닫힌 이슈 ({closedIssues.length})</summary>
            <ul data-testid="closed-issues-list">
              {closedIssues.map(issue => (
                <li
                  key={issue.id}
                  data-testid={`issue-${issue.number}`}
                  onClick={() => setSelectedIssue(issue)}
                  style={{ cursor: 'pointer', padding: '8px', border: '1px solid #ccc', margin: '4px 0' }}
                >
                  #{issue.number} {issue.title} ✓
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section className="detail-panel" data-testid="detail-panel" style={{ flex: 2 }}>
          {selectedIssue ? (
            <div data-testid="issue-detail">
              <h2>이슈 #{selectedIssue.number}</h2>
              <h3>{selectedIssue.title}</h3>
              <p>상태: {selectedIssue.state}</p>

              {/* AI 모델 선택 드롭다운 */}
              <div data-testid="model-selector-container" style={{ margin: '16px 0' }}>
                <label htmlFor="model-select" style={{ marginRight: '8px' }}>AI 모델:</label>
                <select
                  id="model-select"
                  data-testid="model-selector"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isResolving}
                  style={{ padding: '8px', minWidth: '200px' }}
                >
                  {aiModels.map(model => (
                    <option
                      key={model.id}
                      value={model.id}
                      disabled={model.status === 'unavailable'}
                    >
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>

              <button
                data-testid="ai-resolve-btn"
                onClick={handleAIResolve}
                disabled={isResolving}
              >
                {isResolving ? `${aiModels.find(m => m.id === selectedModel)?.name} 해결 중...` : 'AI로 해결'}
              </button>

              {/* 에러 표시 */}
              {error && (
                <div style={{ color: 'red', marginTop: '10px' }}>
                  오류: {error}
                </div>
              )}

              {/* 진행 표시 (SSE 스트리밍) */}
              {isResolving && (
                <div data-testid="progress-display" style={{ marginTop: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
                  <div data-testid="live-indicator" style={{ color: 'red', marginBottom: '8px', fontWeight: 'bold' }}>
                    🔴 LIVE - {aiModels.find(m => m.id === usedModel)?.name}
                  </div>
                  <progress data-testid="progress-bar" value={progress} max={100} style={{ width: '100%', height: '20px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span data-testid="progress-text">{progress}%</span>
                    <span>{progressStage}</span>
                  </div>
                  <div data-testid="model-used" style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    사용 모델: {usedModel}
                  </div>

                  {/* 실시간 코드 스트리밍 표시 */}
                  {streamedCode && (
                    <pre style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#1e293b',
                      color: '#e2e8f0',
                      borderRadius: '6px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      fontSize: '12px'
                    }}>
                      {streamedCode}
                    </pre>
                  )}
                </div>
              )}

              {/* 승인 모달 (AI 완료 후) */}
              {!isResolving && progress === 100 && resolveResult && (
                <div data-testid="approval-modal" style={{ marginTop: '16px', padding: '16px', border: '2px solid #3b82f6', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>AI 생성 코드 검토</h4>
                  <pre
                    data-testid="diff-preview"
                    style={{
                      background: '#1e293b',
                      color: '#e2e8f0',
                      padding: '12px',
                      overflow: 'auto',
                      maxHeight: '200px',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    {resolveResult.code ? (
                      <>
                        <span style={{ color: '#ef4444' }}>- old code</span>
                        {'\n'}
                        <span style={{ color: '#22c55e' }}>+ {resolveResult.code}</span>
                      </>
                    ) : '- old code\n+ new code'}
                  </pre>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    {resolveResult.output?.slice(0, 200)}
                    {resolveResult.output && resolveResult.output.length > 200 ? '...' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      data-testid="approve-btn"
                      onClick={handleApprove}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      ✅ 승인
                    </button>
                    <button
                      data-testid="reject-btn"
                      onClick={handleReject}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      ❌ 거부
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <p>이슈를 선택하세요</p>
          )}
        </section>
      </div>

      {/* 코드 다이어그램 섹션 - 이슈 선택과 무관하게 항상 표시 */}
      {repoParam && (
        <section
          data-testid="code-diagram-section"
          style={{
            marginTop: '24px',
            padding: '20px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b' }}>
            코드 구조 시각화
          </h2>

          {/* 로딩 상태 - Progress Bar */}
          {diagramLoading && (
            <div data-testid="diagram-loading">
              <AnalysisProgressBar
                stage={analysisStage}
                percent={analysisPercent}
                message={analysisMessage}
                error={diagramError || undefined}
              />
            </div>
          )}

          {/* 에러 상태 (로딩 완료 후 에러) */}
          {!diagramLoading && diagramError && (
            <div data-testid="diagram-error">
              <AnalysisProgressBar
                stage="error"
                percent={0}
                message="분석에 실패했습니다"
                error={diagramError}
              />
            </div>
          )}

          {/* 다이어그램 표시 - ReactFlowDiagram */}
          {!diagramLoading && !diagramError && diagramData && (
            <div data-testid="react-flow-diagram-container">
              <ReactFlowDiagram
                mode="layer"
                files={convertAnalyzeDataToFileAnalysis(diagramData)}
                onNodeClick={(nodeId, nodeData) => {
                  console.log('Node clicked:', nodeId, nodeData)
                }}
              />
            </div>
          )}
        </section>
      )}

      {/* AI 리다이렉트 모달 */}
      {selectedIssue && (
        <AIRedirectModal
          isOpen={showRedirectModal}
          onClose={() => setShowRedirectModal(false)}
          issue={{
            number: selectedIssue.number,
            title: selectedIssue.title,
            body: selectedIssue.body,
            labels: selectedIssue.labels,
          }}
          selectedModel={selectedModel}
          onResult={handleRedirectResult}
        />
      )}
    </main>
  )
}

export default function ProjectPage() {
  return (
    <Suspense fallback={
      <main className="project-page" data-testid="project-page">
        <header data-testid="project-header">
          <h1>로딩 중...</h1>
        </header>
      </main>
    }>
      <ProjectContent />
    </Suspense>
  )
}
