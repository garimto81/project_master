'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resolveIssueWithAI, getAvailableModels } from '@/lib/api'
import AIRedirectModal from '@/components/ai-redirect/AIRedirectModal'

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

// 기본 모델 (API 연결 실패 시 사용 - 리다이렉트 모드)
const DEFAULT_MODELS: AIModel[] = [
  { id: 'claude', name: 'Claude', description: 'Anthropic Claude', status: 'available', mode: 'redirect', webUrl: 'https://claude.ai/new' },
  { id: 'gpt-4o', name: 'ChatGPT', description: 'OpenAI GPT-4o', status: 'available', mode: 'redirect', webUrl: 'https://chatgpt.com/' },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini', status: 'available', mode: 'redirect', webUrl: 'https://gemini.google.com/' },
  { id: 'qwen', name: 'Qwen', description: 'Alibaba Qwen', status: 'available', mode: 'redirect', webUrl: 'https://tongyi.aliyun.com/qianwen/' },
]

// E2E 테스트용 Mock 이슈 데이터
const MOCK_ISSUES: Issue[] = [
  { id: 1, number: 1, title: '테스트 이슈 #1', state: 'open', labels: ['bug'] },
  { id: 2, number: 2, title: '테스트 이슈 #2', state: 'open', labels: ['enhancement'] },
  { id: 3, number: 3, title: '닫힌 이슈 #3', state: 'closed', labels: [] },
]

function ProjectContent() {
  const searchParams = useSearchParams()
  const repoParam = searchParams.get('repo') || ''
  const testMode = searchParams.get('test') === 'true'
  const repoName = repoParam.split('/').pop() || '프로젝트'

  const [issues, setIssues] = useState<Issue[]>([])
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('claude')
  const [isResolving, setIsResolving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [usedModel, setUsedModel] = useState<string | null>(null)
  const [aiModels, setAiModels] = useState<AIModel[]>(DEFAULT_MODELS)
  const [resolveResult, setResolveResult] = useState<{ code: string; output: string } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_error, setError] = useState<string | null>(null)
  const [showRedirectModal, setShowRedirectModal] = useState(false)

  const openIssues = issues.filter(i => i.state === 'open')
  const closedIssues = issues.filter(i => i.state === 'closed')

  // GitHub 이슈 목록 가져오기 (테스트 모드에서는 mock 데이터 사용)
  useEffect(() => {
    if (testMode) {
      setIssues(MOCK_ISSUES)
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
  }, [repoParam, testMode])

  // API에서 모델 목록 가져오기 (선택적)
  useEffect(() => {
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
  }, [])

  const handleAIResolve = async () => {
    if (!selectedIssue) return

    const currentModel = aiModels.find(m => m.id === selectedModel)

    // 리다이렉트 모드: 모달 표시
    if (currentModel?.mode === 'redirect') {
      setShowRedirectModal(true)
      return
    }

    // 자동 모드: API 호출
    setIsResolving(true)
    setProgress(0)
    setUsedModel(selectedModel)
    setError(null)
    setResolveResult(null)

    try {
      // 진행률 시뮬레이션 시작
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 300)

      // 실제 백엔드 API 호출
      const result = await resolveIssueWithAI({
        model: selectedModel,
        issue_id: selectedIssue.id,
        issue_title: selectedIssue.title
      })

      clearInterval(progressInterval)
      setProgress(100)
      setUsedModel(result.model_used)
      setResolveResult({ code: result.code, output: result.output })
    } catch (err) {
      // API 실패 시 리다이렉트 모달로 폴백
      console.warn('API call failed, falling back to redirect mode:', err)
      setShowRedirectModal(true)
    } finally {
      setIsResolving(false)
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

              {isResolving && (
                <div data-testid="progress-display">
                  <div data-testid="live-indicator" style={{ color: 'red' }}>
                    🔴 LIVE - {aiModels.find(m => m.id === usedModel)?.name}
                  </div>
                  <progress data-testid="progress-bar" value={progress} max={100} />
                  <span data-testid="progress-text">{progress}%</span>
                  <div data-testid="model-used" style={{ fontSize: '12px', color: '#666' }}>
                    사용 모델: {usedModel}
                  </div>
                </div>
              )}

              {!isResolving && progress === 100 && (
                <div data-testid="approval-modal">
                  <h4>변경 사항 승인</h4>
                  <pre data-testid="diff-preview" style={{ background: '#f5f5f5', padding: '12px', overflow: 'auto', maxHeight: '200px' }}>
                    {resolveResult?.code || '- old code\n+ new code'}
                  </pre>
                  <p style={{ fontSize: '12px', color: '#666' }}>{resolveResult?.output}</p>
                  <button data-testid="approve-btn">승인</button>
                  <button data-testid="reject-btn">거부</button>
                </div>
              )}

              <div data-testid="code-diagram" style={{ marginTop: '20px', border: '1px solid #ddd', height: '300px' }}>
                <p>코드 다이어그램</p>
                <div data-testid="diagram-node" className="node">src/auth.py</div>
              </div>
            </div>
          ) : (
            <p>이슈를 선택하세요</p>
          )}
        </section>
      </div>

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
