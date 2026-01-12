'use client'

/**
 * ImpactView - 영향도 분석 시각화 컴포넌트
 * PRD-0008: "이걸 바꾸면 뭐가 깨지는가?" 시각화
 *
 * 핵심 기능:
 * - 역방향 BFS로 호출자 추적
 * - 삭제 시 영향받는 기능 목록
 * - 위험도 표시 (High/Medium/Low)
 */

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const MermaidDiagram = dynamic(
  () => import('@/components/MermaidDiagram'),
  { ssr: false }
)

// ============================================================
// 타입 정의
// ============================================================

interface Caller {
  id: string
  name: string
  displayName: string
  file: string
  line?: number
  depth: number
}

interface Impact {
  severity: 'high' | 'medium' | 'low'
  type: 'direct' | 'indirect'
  description: string
  callers: Caller[]
}

interface ImpactResult {
  target: {
    id: string
    name: string
    displayName: string
    file?: string
    line?: number
  }
  directCallers: Caller[]
  indirectCallers: Caller[]
  userFeatures: string[]  // PRD-0008: 영향받는 사용자 기능
  impact: Impact
  riskLevel: 'high' | 'medium' | 'low'
  summary: string
  mermaid?: string
}

interface FunctionOption {
  id: string
  name: string
  file: string
}

interface ImpactViewProps {
  repo: string
  onFunctionClick?: (func: Caller) => void
}

// ============================================================
// 스타일 상수
// ============================================================

const RISK_COLORS = {
  high: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', badge: '#fecaca' },
  medium: { bg: '#fffbeb', border: '#d97706', text: '#d97706', badge: '#fde68a' },
  low: { bg: '#f0fdf4', border: '#22c55e', text: '#22c55e', badge: '#bbf7d0' },
}

const DEPTH_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#84cc16']

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function ImpactView({ repo, onFunctionClick }: ImpactViewProps) {
  const [targetFunction, setTargetFunction] = useState('')
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<FunctionOption[]>([])

  // 함수 검색 제안
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const res = await fetch(
        `/api/logic-flow/functions?repo=${encodeURIComponent(repo)}&query=${encodeURIComponent(query)}`
      )
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.functions || [])
      }
    } catch {
      // 검색 실패 시 무시
    }
  }, [repo])

  // 영향도 분석 요청
  const analyzeImpact = useCallback(async () => {
    // 헬퍼 함수 (로컬 스코프)
    const makeMockResult = (funcName: string): ImpactResult => {
      const directCallers: Caller[] = [
        { id: '1', name: 'handleSubmit', displayName: '폼 제출 처리', file: 'src/components/Form.tsx', line: 25, depth: 1 },
        { id: '2', name: 'useAuth', displayName: '인증 훅', file: 'src/hooks/useAuth.ts', line: 10, depth: 1 },
      ]
      const indirectCallers: Caller[] = [
        { id: '3', name: 'LoginPage', displayName: '로그인 페이지', file: 'src/pages/Login.tsx', line: 5, depth: 2 },
        { id: '4', name: 'App', displayName: '앱 루트', file: 'src/App.tsx', line: 8, depth: 3 },
      ]
      return {
        target: { id: 'target', name: funcName, displayName: translateFunctionName(funcName), file: 'src/lib/' + funcName + '.ts' },
        directCallers,
        indirectCallers,
        userFeatures: ['로그인', '인증'],
        impact: {
          severity: directCallers.length > 2 ? 'high' : directCallers.length > 0 ? 'medium' : 'low',
          type: 'direct',
          description: `이 함수를 삭제하면 ${directCallers.length + indirectCallers.length}개 기능에 영향이 갑니다.`,
          callers: [...directCallers, ...indirectCallers],
        },
        riskLevel: directCallers.length > 2 ? 'high' : directCallers.length > 0 ? 'medium' : 'low',
        summary: `${funcName}는 ${directCallers.length}개 함수에서 직접 호출되고, ${indirectCallers.length}개 함수에서 간접 호출됩니다.`,
        mermaid: generateMermaid(funcName, directCallers, indirectCallers),
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatResult = (raw: any): ImpactResult => {
      // API 응답 구조: affectedCallers (ImpactNode[]), summary (ImpactSummary 객체)
      // 클라이언트 구조: directCallers/indirectCallers, summary (문자열)
      const allCallers = raw.affectedCallers || []
      const direct = allCallers.filter((c: Caller & { impactLevel?: string }) => c.impactLevel === 'direct' || c.depth === 1)
      const indirect = allCallers.filter((c: Caller & { impactLevel?: string }) => c.impactLevel === 'indirect' || c.depth > 1)

      // summary가 객체면 humanReadableMessage 추출, 문자열이면 그대로 사용
      const summaryText = typeof raw.summary === 'object' && raw.summary !== null
        ? raw.summary.humanReadableMessage || ''
        : raw.summary || ''

      // riskLevel: summary.severity 또는 직접 전달된 값
      const riskLevel = (typeof raw.summary === 'object' && raw.summary?.severity)
        ? (raw.summary.severity === 'critical' ? 'high' : raw.summary.severity)
        : (raw.riskLevel || 'low')

      // mermaid: visualizationData.mermaidCode 또는 직접 전달된 값
      const mermaidCode = raw.visualizationData?.mermaidCode || raw.mermaid || generateMermaid(targetFunction, direct, indirect)

      return {
        target: raw.target || { id: 'target', name: targetFunction, displayName: targetFunction },
        directCallers: direct,
        indirectCallers: indirect,
        userFeatures: raw.userFeatures || [],
        impact: raw.impact || { severity: riskLevel, type: 'direct', description: '', callers: [...direct, ...indirect] },
        riskLevel,
        summary: summaryText,
        mermaid: mermaidCode,
      }
    }

    if (!targetFunction.trim()) {
      setError('함수명을 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setImpactResult(null)

    try {
      const res = await fetch('/api/logic-flow/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          target: { name: targetFunction.trim() },
          maxDepth: 5,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '분석 실패')
      }

      const data = await res.json()
      if (data.result) {
        setImpactResult(formatResult(data.result))
      } else {
        setImpactResult(makeMockResult(targetFunction))
      }
    } catch (err) {
      const error = err as Error
      setError(error.message)
      // Mock 데이터로 fallback
      setImpactResult(makeMockResult(targetFunction))
    } finally {
      setLoading(false)
    }
  }, [repo, targetFunction])

  // 함수명 번역
  function translateFunctionName(name: string): string {
    const translations: Record<string, string> = {
      handleLogin: '로그인 처리',
      handleSubmit: '폼 제출',
      fetchData: '데이터 가져오기',
      saveData: '데이터 저장',
      validateForm: '폼 검증',
      signIn: '로그인',
      signOut: '로그아웃',
      useAuth: '인증 훅',
    }
    return translations[name] || name.replace(/([A-Z])/g, ' $1').trim()
  }

  // Mermaid 다이어그램 생성
  function generateMermaid(target: string, direct: Caller[], indirect: Caller[]): string {
    const lines: string[] = ['graph BT']

    // 스타일 정의
    lines.push('  classDef target fill:#dc2626,color:#fff,stroke:#991b1b')
    lines.push('  classDef direct fill:#f97316,color:#fff,stroke:#c2410c')
    lines.push('  classDef indirect fill:#fbbf24,color:#000,stroke:#d97706')

    // 대상 노드
    lines.push(`  target["${target}"]:::target`)

    // 직접 호출자
    direct.forEach((caller, idx) => {
      lines.push(`  d${idx}["${caller.displayName}"]:::direct`)
      lines.push(`  d${idx} --> target`)
    })

    // 간접 호출자
    indirect.forEach((caller, idx) => {
      lines.push(`  i${idx}["${caller.displayName}"]:::indirect`)
      // 간접 호출자는 직접 호출자에 연결
      if (direct.length > 0) {
        lines.push(`  i${idx} --> d${idx % direct.length}`)
      } else {
        lines.push(`  i${idx} --> target`)
      }
    })

    return lines.join('\n')
  }

  return (
    <div data-testid="impact-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 검색 영역 */}
      <div style={{
        padding: '20px',
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#1e293b' }}>
          ⚠️ 영향도 분석
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
          함수나 컴포넌트를 입력하면 삭제/수정 시 영향받는 코드를 분석합니다.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={targetFunction}
              onChange={(e) => {
                setTargetFunction(e.target.value)
                fetchSuggestions(e.target.value)
              }}
              placeholder="함수명 입력 (예: handleLogin, useAuth)"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  analyzeImpact()
                }
              }}
            />

            {/* 자동완성 드롭다운 */}
            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginTop: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {suggestions.map((func) => (
                  <button
                    key={func.id}
                    onClick={() => {
                      setTargetFunction(func.name)
                      setSuggestions([])
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{func.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{func.file}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={analyzeImpact}
            disabled={loading || !targetFunction.trim()}
            style={{
              padding: '12px 24px',
              background: loading ? '#94a3b8' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {loading ? '분석 중...' : '분석'}
          </button>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{
          padding: '60px',
          background: '#fff',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <p>영향도 분석 중...</p>
        </div>
      )}

      {/* 에러 */}
      {error && !impactResult && (
        <div style={{
          padding: '16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
        }}>
          {error}
        </div>
      )}

      {/* 경고 (fallback 데이터) */}
      {error && impactResult && (
        <div style={{
          padding: '12px 16px',
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          color: '#92400e',
          fontSize: '13px',
        }}>
          API 분석 실패, 예시 데이터로 표시합니다: {error}
        </div>
      )}

      {/* 결과 */}
      {!loading && impactResult && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* 왼쪽: 영향 요약 */}
          <div style={{
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}>
            {/* 위험도 배지 */}
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: RISK_COLORS[impactResult.riskLevel].badge,
              borderRadius: '20px',
              marginBottom: '16px',
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: RISK_COLORS[impactResult.riskLevel].text,
              }}>
                {impactResult.riskLevel === 'high' ? '🔴 높은 위험' :
                 impactResult.riskLevel === 'medium' ? '🟡 중간 위험' : '🟢 낮은 위험'}
              </span>
            </div>

            {/* 대상 함수 */}
            <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#1e293b' }}>
              {impactResult.target.displayName}
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
              <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                {impactResult.target.name}()
              </code>
              {impactResult.target.file && (
                <span style={{ marginLeft: '8px' }}>@ {impactResult.target.file}</span>
              )}
            </p>

            {/* 요약 */}
            <div style={{
              padding: '16px',
              background: RISK_COLORS[impactResult.riskLevel].bg,
              border: `1px solid ${RISK_COLORS[impactResult.riskLevel].border}`,
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>
                {impactResult.summary}
              </p>
            </div>

            {/* 직접 호출자 */}
            <h5 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>
              직접 호출 ({impactResult.directCallers.length}개)
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {impactResult.directCallers.length === 0 ? (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', color: '#64748b', fontSize: '13px' }}>
                  직접 호출하는 함수가 없습니다.
                </div>
              ) : (
                impactResult.directCallers.map((caller, idx) => (
                  <button
                    key={caller.id}
                    onClick={() => onFunctionClick?.(caller)}
                    style={{
                      padding: '12px 16px',
                      background: '#fff',
                      border: `2px solid ${DEPTH_COLORS[0]}`,
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: onFunctionClick ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: DEPTH_COLORS[0],
                        color: '#fff',
                        borderRadius: '50%',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>
                        {caller.displayName}
                      </span>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                      {caller.file}:{caller.line}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* 간접 호출자 */}
            {impactResult.indirectCallers.length > 0 && (
              <>
                <h5 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>
                  간접 영향 ({impactResult.indirectCallers.length}개)
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {impactResult.indirectCallers.map((caller) => (
                    <div
                      key={caller.id}
                      style={{
                        padding: '10px 16px',
                        background: '#f8fafc',
                        border: `1px solid ${DEPTH_COLORS[caller.depth - 1] || '#e2e8f0'}`,
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: DEPTH_COLORS[caller.depth - 1] || '#94a3b8',
                          color: '#fff',
                          borderRadius: '50%',
                          fontSize: '10px',
                        }}>
                          {caller.depth}
                        </span>
                        <span style={{ color: '#1e293b' }}>{caller.displayName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {/* PRD-0008: 영향받는 사용자 기능 */}
            {impactResult.userFeatures && impactResult.userFeatures.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h5 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>
                  영향받는 기능 ({impactResult.userFeatures.length}개)
                </h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {impactResult.userFeatures.map((feature, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        background: RISK_COLORS[impactResult.riskLevel].badge,
                        color: RISK_COLORS[impactResult.riskLevel].text,
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 다이어그램 */}
          <div style={{
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#1e293b' }}>
              📊 영향 범위 다이어그램
            </h4>

            {impactResult.mermaid && (
              <MermaidDiagram
                chart={impactResult.mermaid}
                enableZoom={true}
                showLegend={false}
              />
            )}

            {/* 범례 */}
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px',
            }}>
              <h5 style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
                범례
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    background: '#dc2626',
                    borderRadius: '4px',
                  }} />
                  <span style={{ color: '#64748b' }}>대상 함수</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    background: '#f97316',
                    borderRadius: '4px',
                  }} />
                  <span style={{ color: '#64748b' }}>직접 호출 (1단계)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    background: '#fbbf24',
                    borderRadius: '4px',
                  }} />
                  <span style={{ color: '#64748b' }}>간접 호출 (2단계+)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 초기 상태 */}
      {!loading && !impactResult && !error && (
        <div style={{
          padding: '60px',
          background: '#fff',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
          <p style={{ margin: 0, fontSize: '15px' }}>
            위에서 함수명을 입력하고 분석 버튼을 클릭하세요
          </p>
        </div>
      )}
    </div>
  )
}
