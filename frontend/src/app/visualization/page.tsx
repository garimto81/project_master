'use client'

/**
 * Visualization Page - 코드 로직 시각화
 * PRD v6.2 Section 1.2: 다층 시각화 시스템
 *
 * Level 0: 전체 레포 목록
 * Level 1-A: 큰 그림 (데이터 흐름)
 * Level 1-B: 구체적 다이어그램 (레이어 상세)
 * Level 2: 모듈/컴포넌트 상세
 * Level 3: 함수 실행 흐름
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { signInWithGitHub } from '@/lib/supabase'

// 클라이언트 컴포넌트 동적 로드
const MermaidDiagram = dynamic(
  () => import('@/components/MermaidDiagram'),
  { ssr: false }
)

const InteractiveFlowDiagram = dynamic(
  () => import('@/components/InteractiveFlowDiagram'),
  { ssr: false }
)

const LogicFlowViewer = dynamic(
  () => import('@/components/logic-flow/LogicFlowViewer'),
  { ssr: false }
)

const StepPlayer = dynamic(
  () => import('@/components/logic-flow/StepPlayer'),
  { ssr: false }
)

type ViewLevel = 'repos' | 'big-picture' | 'layer-detail' | 'module' | 'function'

interface Repository {
  name: string
  full_name: string
  description: string | null
  language: string | null
  stars: number
  open_issues: number
  updated_at: string
}

interface Layer {
  name: string
  displayName: string
  modules: string[]
  description: string
}

interface FunctionInfo {
  name: string
  type: 'function' | 'class' | 'component'
  calls: string[]
  status: 'normal' | 'error'
  line_start: number
  line_end: number
}

interface Connection {
  from: string
  to: string
  type: 'call' | 'fetch' | 'import' | 'event'
  label?: string
}

interface CircularDependency {
  cycle: string[]
  severity: 'warning' | 'error'
  suggestion: string
}

interface AnalyzeData {
  repo: string
  data_flow: {
    entry_points: string[]
    layers: Layer[]
    connections?: Connection[]
  }
  circular_dependencies?: CircularDependency[]
  unused_files?: string[]
  risk_points: Array<{
    location: string
    function: string
    risk: 'high' | 'medium' | 'low'
    reason: string
    suggestion: string
  }>
  issues: Array<{
    number: number
    title: string
    labels: string[]
    related_layer?: string
  }>
  mermaid_code: string
  summary: string
  stats?: {
    totalFiles: number
    analyzedFiles: number
    totalDependencies: number
    circularCount: number
    unusedCount: number
  }
}

function VisualizationContent() {
  const searchParams = useSearchParams()
  const ownerParam = searchParams.get('owner') || 'garimto81'
  const repoParam = searchParams.get('repo')

  // 상태 관리
  const [viewLevel, setViewLevel] = useState<ViewLevel>(repoParam ? 'big-picture' : 'repos')
  const [owner, setOwner] = useState(ownerParam)
  const [selectedRepo, setSelectedRepo] = useState<string | null>(repoParam)
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null)

  // 데이터 상태
  const [repos, setRepos] = useState<Repository[]>([])
  const [reposMermaid, setReposMermaid] = useState<string>('')
  const [analyzeData, setAnalyzeData] = useState<AnalyzeData | null>(null)
  const [moduleFunctions, setModuleFunctions] = useState<FunctionInfo[]>([])
  const [moduleMermaid, setModuleMermaid] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 브레드크럼 생성
  const breadcrumbs = [
    { label: owner, level: 'repos' as ViewLevel },
    ...(selectedRepo ? [{ label: selectedRepo.split('/')[1], level: 'big-picture' as ViewLevel }] : []),
    ...(selectedLayer ? [{ label: selectedLayer, level: 'layer-detail' as ViewLevel }] : []),
    ...(selectedModule ? [{ label: selectedModule, level: 'module' as ViewLevel }] : []),
    ...(selectedFunction ? [{ label: selectedFunction, level: 'function' as ViewLevel }] : []),
  ]

  // Level 0: 레포 목록 로드
  useEffect(() => {
    if (viewLevel === 'repos') {
      loadRepos()
    }
  }, [viewLevel, owner])

  // Level 1-A: 큰 그림 로드
  useEffect(() => {
    if (viewLevel === 'big-picture' && selectedRepo) {
      loadAnalyze()
    }
  }, [viewLevel, selectedRepo])

  async function loadRepos() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/logic-flow/repos?owner=${owner}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '레포 목록 로드 실패')
      }
      const data = await res.json()
      setRepos(data.repositories || [])
      setReposMermaid(data.mermaid_code || '')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadAnalyze() {
    setLoading(true)
    setError(null)
    setAnalyzeData(null)  // 명시적 초기화
    try {
      const res = await fetch('/api/logic-flow/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: selectedRepo,
          depth: 'medium',
          include_risk: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `코드 분석 실패 (HTTP ${res.status})`)
      }

      const data = await res.json()

      // 응답 데이터 검증
      if (!data || !data.data_flow || !data.data_flow.layers) {
        throw new Error('분석 데이터가 불완전합니다. 다시 시도해주세요.')
      }

      setAnalyzeData(data)
    } catch (err: any) {
      console.error('loadAnalyze error:', err)
      setError(err.message || '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // Level 2: 모듈 상세 로드
  async function loadModuleDetail(moduleName: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/logic-flow/module?repo=${encodeURIComponent(selectedRepo || '')}&module=${encodeURIComponent(moduleName)}`
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '모듈 분석 실패')
      }
      const data = await res.json()
      setModuleFunctions(data.functions || [])
      setModuleMermaid(data.mermaid_code || '')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 레포 선택
  function handleRepoSelect(repo: Repository) {
    setSelectedRepo(repo.full_name)
    setSelectedLayer(null)
    setSelectedModule(null)
    setSelectedFunction(null)
    setAnalyzeData(null)  // 이전 데이터 초기화
    setError(null)        // 이전 에러 초기화
    setLoading(true)      // 즉시 로딩 상태로 전환
    setViewLevel('big-picture')
  }

  // 레이어 선택
  function handleLayerSelect(layer: Layer) {
    setSelectedLayer(layer.displayName)
    setViewLevel('layer-detail')
  }

  // 모듈 선택
  function handleModuleSelect(moduleName: string) {
    setSelectedModule(moduleName)
    setSelectedFunction(null)
    setViewLevel('module')
    loadModuleDetail(moduleName)
  }

  // 함수 선택
  function handleFunctionSelect(funcName: string) {
    setSelectedFunction(funcName)
    setViewLevel('function')
  }

  // 뒤로가기
  function handleBack() {
    if (viewLevel === 'function') {
      setSelectedFunction(null)
      setViewLevel('module')
    } else if (viewLevel === 'module') {
      setSelectedModule(null)
      setModuleFunctions([])
      setModuleMermaid('')
      setViewLevel('layer-detail')
    } else if (viewLevel === 'layer-detail') {
      setSelectedLayer(null)
      setViewLevel('big-picture')
    } else if (viewLevel === 'big-picture') {
      setSelectedRepo(null)
      setAnalyzeData(null)
      setViewLevel('repos')
    }
  }

  return (
    <main
      data-testid="visualization-page"
      style={{
        minHeight: '100vh',
        background: '#f1f5f9',
      }}
    >
      {/* 헤더 */}
      <header
        data-testid="header"
        style={{
          background: '#fff',
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link
              href="/"
              style={{
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              ← DevFlow
            </Link>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
              코드 시각화 <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>v2.0 (PRD v6.2)</span>
            </h1>
          </div>

          {viewLevel !== 'repos' && (
            <button
              onClick={handleBack}
              style={{
                padding: '8px 16px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ← 뒤로
            </button>
          )}
        </div>

        {/* 브레드크럼 */}
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {idx > 0 && <span style={{ color: '#94a3b8' }}>/</span>}
              <button
                onClick={() => {
                  if (crumb.level === 'repos') {
                    setSelectedRepo(null)
                    setSelectedLayer(null)
                    setSelectedModule(null)
                    setAnalyzeData(null)
                    setViewLevel('repos')
                  } else if (crumb.level === 'big-picture') {
                    setSelectedLayer(null)
                    setSelectedModule(null)
                    setViewLevel('big-picture')
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: idx === breadcrumbs.length - 1 ? '#1e293b' : '#3b82f6',
                  fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                  padding: 0,
                }}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>
      </header>

      {/* 메인 콘텐츠 */}
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* 에러 표시 + 로그인 버튼 */}
        {error && (
          <div style={{
            padding: '24px',
            background: error.includes('인증') ? '#fff' : '#fef2f2',
            border: error.includes('인증') ? '1px solid #e2e8f0' : '1px solid #fecaca',
            borderRadius: '12px',
            color: error.includes('인증') ? '#1e293b' : '#dc2626',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {error.includes('인증') ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>GitHub 로그인이 필요합니다</h2>
                <p style={{ margin: '0 0 24px', color: '#64748b' }}>
                  코드 시각화를 사용하려면 GitHub 계정으로 로그인하세요.
                </p>
                <button
                  onClick={() => signInWithGitHub('/visualization')}
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#24292f',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 500,
                  }}
                >
                  GitHub으로 로그인 →
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#dc2626' }}>
                  분석 중 오류 발생
                </h2>
                <p style={{ margin: '0 0 16px', color: '#64748b' }}>
                  {error}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      setError(null)
                      if (viewLevel === 'big-picture') {
                        loadAnalyze()
                      } else if (viewLevel === 'repos') {
                        loadRepos()
                      }
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    다시 시도
                  </button>
                  <button
                    onClick={handleBack}
                    style={{
                      padding: '12px 24px',
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    뒤로가기
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div style={{
            padding: '60px',
            background: '#fff',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#64748b',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <p>데이터를 불러오는 중...</p>
          </div>
        )}

        {/* Level 0: 레포 목록 */}
        {!loading && viewLevel === 'repos' && (
          <div data-testid="repos-section">
            <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#1e293b' }}>
              Level 0: 전체 레포지토리 ({repos.length}개)
            </h2>
            <p style={{ margin: '0 0 24px', color: '#64748b' }}>
              프로젝트를 선택하여 코드 구조를 확인하세요.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}>
              {repos.map((repo) => (
                <div
                  key={repo.full_name}
                  onClick={() => handleRepoSelect(repo)}
                  style={{
                    padding: '20px',
                    background: '#fff',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
                      {repo.name}
                    </h3>
                    <span style={{
                      padding: '2px 8px',
                      background: '#f1f5f9',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#64748b',
                    }}>
                      {repo.language || 'Unknown'}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0', color: '#64748b', fontSize: '14px' }}>
                    {repo.description || '설명 없음'}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                    <span>⭐ {repo.stars}</span>
                    {repo.open_issues > 0 && (
                      <span style={{ color: '#dc2626' }}>🔴 이슈 {repo.open_issues}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level 1-A: 큰 그림 - analyzeData 없을 때 대기 상태 */}
        {!loading && viewLevel === 'big-picture' && !analyzeData && !error && (
          <div data-testid="big-picture-empty-state" style={{
            padding: '60px',
            background: '#fff',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#64748b',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>
              {selectedRepo} 분석 준비 중
            </h2>
            <p style={{ margin: '0 0 24px' }}>
              분석이 시작되지 않았습니다.
            </p>
            <button
              onClick={() => loadAnalyze()}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              분석 시작
            </button>
          </div>
        )}

        {/* Level 1-A: 큰 그림 */}
        {!loading && viewLevel === 'big-picture' && analyzeData && (
          <div data-testid="big-picture-section">
            <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#1e293b' }}>
              Level 1-A: 큰 그림 - {selectedRepo}
            </h2>
            <p style={{ margin: '0 0 24px', color: '#64748b' }}>
              데이터가 어떻게 흐르는지 확인하세요. 레이어를 클릭하면 상세 정보를 볼 수 있습니다.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              {/* 인터랙티브 다이어그램 */}
              <div>
                <InteractiveFlowDiagram
                  layers={analyzeData.data_flow.layers}
                  connections={analyzeData.data_flow.connections || []}
                  riskPoints={analyzeData.risk_points}
                  issues={analyzeData.issues}
                  onLayerClick={handleLayerSelect}
                  onModuleClick={(moduleName, layer) => {
                    setSelectedLayer(layer.displayName)
                    handleModuleSelect(moduleName)
                  }}
                />
              </div>

              {/* 사이드바: 요약 정보 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 분석 요약 */}
                <div style={{
                  padding: '20px',
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#1e293b' }}>
                    📊 분석 요약
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
                        {analyzeData.data_flow.layers.length}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>레이어</div>
                    </div>
                    <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
                        {analyzeData.data_flow.layers.reduce((sum, l) => sum + l.modules.length, 0)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>모듈</div>
                    </div>
                    <div style={{ padding: '12px', background: analyzeData.issues.length > 0 ? '#fef2f2' : '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: analyzeData.issues.length > 0 ? '#dc2626' : '#1e293b' }}>
                        {analyzeData.issues.length}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>이슈</div>
                    </div>
                    <div style={{ padding: '12px', background: analyzeData.risk_points.length > 0 ? '#fffbeb' : '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: analyzeData.risk_points.length > 0 ? '#d97706' : '#1e293b' }}>
                        {analyzeData.risk_points.length}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>위험</div>
                    </div>
                  </div>
                </div>

                {/* 이슈 목록 */}
                {analyzeData.issues.length > 0 && (
                  <div style={{
                    padding: '20px',
                    background: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#1e293b' }}>
                      🔴 열린 이슈 ({analyzeData.issues.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analyzeData.issues.slice(0, 5).map((issue) => (
                        <div
                          key={issue.number}
                          style={{
                            padding: '12px',
                            background: '#fef2f2',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}
                        >
                          <span style={{ color: '#dc2626', fontWeight: 500 }}>#{issue.number}</span>
                          <span style={{ marginLeft: '8px', color: '#1e293b' }}>{issue.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 위험 지점 */}
                {analyzeData.risk_points.length > 0 && (
                  <div style={{
                    padding: '20px',
                    background: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#1e293b' }}>
                      ⚠️ 위험 지점 ({analyzeData.risk_points.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analyzeData.risk_points.slice(0, 3).map((risk, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            background: risk.risk === 'high' ? '#fef2f2' : '#fffbeb',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}
                        >
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>{risk.function}()</div>
                          <div style={{ color: '#64748b', marginTop: '4px' }}>{risk.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mermaid 다이어그램 (축소) */}
                <details style={{
                  padding: '20px',
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#1e293b' }}>
                    📈 Mermaid 다이어그램 보기 (클릭하여 확대/축소)
                  </summary>
                  <div style={{ marginTop: '16px' }}>
                    {analyzeData.mermaid_code && (
                      <MermaidDiagram
                        chart={analyzeData.mermaid_code}
                        enableZoom={true}
                        showLegend={true}
                        circularNodes={analyzeData.circular_dependencies?.flatMap(cd => cd.cycle) || []}
                        onNodeClick={(nodeId) => {
                          // 노드 클릭 시 해당 레이어로 이동
                          const layerMatch = nodeId.match(/^(ui|logic|server|data)_/)
                          if (layerMatch) {
                            const layerName = layerMatch[1]
                            const layer = analyzeData.data_flow.layers.find(l => l.name === layerName)
                            if (layer) {
                              setSelectedLayer(layer.displayName)
                              setViewLevel('layer-detail')
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* Level 1-B: 레이어 상세 */}
        {!loading && viewLevel === 'layer-detail' && analyzeData && selectedLayer && (
          <div data-testid="layer-detail-section">
            <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#1e293b' }}>
              Level 1-B: {selectedLayer} 레이어 상세
            </h2>
            <p style={{ margin: '0 0 24px', color: '#64748b' }}>
              이 레이어에 포함된 모듈들입니다. 모듈을 클릭하면 함수 목록을 볼 수 있습니다.
            </p>

            {(() => {
              const layer = analyzeData.data_flow.layers.find(l => l.displayName === selectedLayer)
              if (!layer) return null

              // 레이어별 색상 설정
              const layerColors: Record<string, { bg: string; border: string; icon: string }> = {
                'ui': { bg: '#dbeafe', border: '#3b82f6', icon: '🖥️' },
                'logic': { bg: '#dcfce7', border: '#22c55e', icon: '⚙️' },
                'server': { bg: '#ffedd5', border: '#f97316', icon: '🌐' },
                'data': { bg: '#e0e7ff', border: '#6366f1', icon: '💾' },
              }
              const colors = layerColors[layer.name] || layerColors.logic

              // 모듈별 위험도 계산
              const getModuleRisk = (modName: string): 'high' | 'medium' | 'low' | 'none' => {
                const risks = analyzeData.risk_points.filter(r =>
                  r.location.toLowerCase().includes(modName.toLowerCase())
                )
                if (risks.some(r => r.risk === 'high')) return 'high'
                if (risks.some(r => r.risk === 'medium')) return 'medium'
                if (risks.length > 0) return 'low'
                return 'none'
              }

              const riskColors = {
                high: { bg: '#fef2f2', border: '#dc2626', badge: '🔴' },
                medium: { bg: '#fffbeb', border: '#d97706', badge: '🟡' },
                low: { bg: '#f0fdf4', border: '#22c55e', badge: '🟢' },
                none: { bg: '#fff', border: '#e2e8f0', badge: '' },
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                  {/* 모듈 그리드 */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px',
                  }}>
                    {layer.modules.map((mod) => {
                      const risk = getModuleRisk(mod)
                      const rc = riskColors[risk]

                      return (
                        <div
                          key={mod}
                          data-testid={`module-card-${mod}`}
                          onClick={() => handleModuleSelect(mod)}
                          style={{
                            padding: '20px',
                            background: risk !== 'none' ? rc.bg : colors.bg,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            border: `2px solid ${risk !== 'none' ? rc.border : colors.border}`,
                            transition: 'all 0.2s',
                            position: 'relative',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          {/* 위험도 배지 */}
                          {risk !== 'none' && (
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              fontSize: '14px',
                            }}>
                              {rc.badge}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '20px' }}>{colors.icon}</span>
                            <h4 style={{ margin: 0, color: '#1e293b', fontSize: '15px' }}>{mod}</h4>
                          </div>

                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                            클릭하여 함수 목록 보기 →
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* 사이드바: 레이어 정보 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* 레이어 정보 카드 */}
                    <div style={{
                      padding: '20px',
                      background: colors.bg,
                      borderRadius: '12px',
                      border: `2px solid ${colors.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '32px' }}>{colors.icon}</span>
                        <div>
                          <h3 style={{ margin: 0, color: '#1e293b' }}>{layer.displayName}</h3>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>{layer.description}</p>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        <strong>{layer.modules.length}</strong>개 모듈
                      </div>
                    </div>

                    {/* 위험도 범례 */}
                    <div style={{
                      padding: '16px',
                      background: '#fff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                    }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#1e293b' }}>
                        위험도 표시
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <span>🔴</span>
                          <span style={{ color: '#dc2626' }}>높음</span>
                          <span style={{ color: '#64748b' }}>- 에러 처리 필요</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <span>🟡</span>
                          <span style={{ color: '#d97706' }}>중간</span>
                          <span style={{ color: '#64748b' }}>- 개선 권장</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <span>🟢</span>
                          <span style={{ color: '#22c55e' }}>낮음</span>
                          <span style={{ color: '#64748b' }}>- 양호</span>
                        </div>
                      </div>
                    </div>

                    {/* 해당 레이어 관련 위험 지점 */}
                    {analyzeData.risk_points.filter(r =>
                      layer.modules.some(m => r.location.toLowerCase().includes(m.toLowerCase()))
                    ).length > 0 && (
                      <div style={{
                        padding: '16px',
                        background: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                      }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#1e293b' }}>
                          ⚠️ 이 레이어의 위험 지점
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {analyzeData.risk_points
                            .filter(r => layer.modules.some(m => r.location.toLowerCase().includes(m.toLowerCase())))
                            .slice(0, 5)
                            .map((risk, idx) => (
                              <div key={idx} style={{
                                padding: '10px',
                                background: risk.risk === 'high' ? '#fef2f2' : '#fffbeb',
                                borderRadius: '6px',
                                fontSize: '12px',
                              }}>
                                <div style={{ fontWeight: 500, color: '#1e293b' }}>{risk.function}()</div>
                                <div style={{ color: '#64748b', marginTop: '4px' }}>{risk.reason}</div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Level 2: 모듈 상세 */}
        {!loading && viewLevel === 'module' && selectedModule && (
          <div data-testid="module-section">
            <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#1e293b' }}>
              Level 2: {selectedModule} 모듈 상세
            </h2>
            <p style={{ margin: '0 0 24px', color: '#64748b' }}>
              이 모듈의 함수들입니다. 함수를 클릭하면 실행 흐름을 볼 수 있습니다.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              {/* 다이어그램 */}
              <div style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '12px',
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#1e293b' }}>
                  📊 모듈 구조 다이어그램
                </h3>
                {moduleMermaid ? (
                  <MermaidDiagram
                    chart={moduleMermaid}
                    enableZoom={true}
                    showLegend={false}
                    onNodeClick={(nodeId) => {
                      // 함수 노드 클릭 시 Level 3로 이동
                      const funcName = nodeId.replace(/^func_/, '').replace(/_/g, '')
                      const func = moduleFunctions.find(f =>
                        f.name.replace(/[^a-zA-Z0-9]/g, '') === funcName
                      )
                      if (func) {
                        handleFunctionSelect(func.name)
                      }
                    }}
                  />
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    다이어그램 로딩 중...
                  </div>
                )}
              </div>

              {/* 함수 목록 */}
              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#1e293b' }}>
                  ⚙️ 함수 목록 ({moduleFunctions.length}개)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {moduleFunctions.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                      함수 정보 없음
                    </div>
                  ) : (
                    moduleFunctions.map((func, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleFunctionSelect(func.name)}
                        style={{
                          padding: '16px',
                          background: func.status === 'error' ? '#fef2f2' : '#fff',
                          border: `1px solid ${func.status === 'error' ? '#fecaca' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = func.status === 'error' ? '#fecaca' : '#e2e8f0'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>
                            {func.type === 'class' ? '📦' : func.type === 'component' ? '🧩' : '⚙️'}
                          </span>
                          <span style={{ fontWeight: 500, color: '#1e293b' }}>
                            {func.name}()
                          </span>
                          {func.status === 'error' && (
                            <span style={{ fontSize: '12px', color: '#dc2626' }}>🔴</span>
                          )}
                        </div>
                        {func.calls.length > 0 && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            호출: {func.calls.slice(0, 3).join(', ')}{func.calls.length > 3 ? '...' : ''}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                          Line {func.line_start}-{func.line_end}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Level 3: 함수 실행 흐름 */}
        {!loading && viewLevel === 'function' && selectedRepo && selectedFunction && (
          <div data-testid="function-section">
            <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#1e293b' }}>
              Level 3: {selectedFunction}() 실행 흐름
            </h2>
            <p style={{ margin: '0 0 24px', color: '#64748b' }}>
              함수가 어떻게 실행되는지 단계별로 확인하세요.
            </p>

            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
            }}>
              <StepPlayer
                repo={selectedRepo}
                functionName={selectedFunction}
                path={selectedModule ? `src/${selectedModule}/` : undefined}
                autoPlay={false}
                speed="normal"
              />
            </div>
          </div>
        )}

        {/* 도움말 */}
        <div
          style={{
            marginTop: '32px',
            padding: '20px',
            background: '#eff6ff',
            borderRadius: '12px',
            border: '1px solid #bfdbfe',
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1d4ed8' }}>
            💡 시각화 네비게이션
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', lineHeight: '1.8' }}>
            <li><strong>Level 0</strong>: 전체 레포지토리 목록 - 프로젝트 선택</li>
            <li><strong>Level 1-A</strong>: 큰 그림 - 데이터 흐름 (UI → 로직 → 서버)</li>
            <li><strong>Level 1-B</strong>: 구체적 다이어그램 - 레이어별 모듈 목록</li>
            <li><strong>Level 2</strong>: 모듈 상세 - 함수 목록 + 다이어그램</li>
            <li><strong>Level 3</strong>: 함수 흐름 - 스텝바이스텝 실행 플레이어</li>
          </ul>
        </div>
      </div>
    </main>
  )
}

export default function VisualizationPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
      }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <p>시각화 로딩 중...</p>
        </div>
      </div>
    }>
      <VisualizationContent />
    </Suspense>
  )
}
