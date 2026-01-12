'use client'

/**
 * JourneyView - 행동 중심 시각화 컴포넌트
 * PRD-0008: "코드가 어떻게 작동하는가" 시각화
 *
 * 핵심 기능:
 * - 사용자 여정 시퀀스 (P0)
 * - 비개발자 친화적 언어
 * - 단계별 흐름 표시
 */

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

const MermaidDiagram = dynamic(
  () => import('@/components/MermaidDiagram'),
  { ssr: false }
)

// ============================================================
// 타입 정의
// ============================================================

interface JourneyStep {
  order: number
  action: string           // 비개발자 언어 (예: "버튼 클릭")
  technical: string        // 기술 용어 (예: "handleLoginClick()")
  type: 'user' | 'logic' | 'api' | 'data'
  file?: string
  line?: number
}

interface JourneyOutcome {
  type: 'success' | 'error' | 'redirect'
  label: string
  displayLabel: string
  condition?: string
}

interface JourneyFlow {
  id: string
  name: string
  displayName: string
  description: string
  trigger: {
    type: 'click' | 'submit' | 'load' | 'api' | 'effect' | 'timer' | 'external'
    element?: string
    displayLabel: string
    file?: string
    line?: number
  }
  steps: JourneyStep[]
  outcomes: JourneyOutcome[]
  mermaid?: string
}

interface FeatureOption {
  id: string
  label: string
  description: string
}

interface JourneyViewProps {
  repo: string
  onStepClick?: (step: JourneyStep) => void
}

// ============================================================
// 아이콘 매핑
// ============================================================

const STEP_ICONS: Record<JourneyStep['type'], string> = {
  user: '👤',
  logic: '⚙️',
  api: '🌐',
  data: '💾',
}

const STEP_COLORS: Record<JourneyStep['type'], { bg: string; border: string }> = {
  user: { bg: '#dbeafe', border: '#3b82f6' },
  logic: { bg: '#dcfce7', border: '#22c55e' },
  api: { bg: '#ffedd5', border: '#f97316' },
  data: { bg: '#e0e7ff', border: '#6366f1' },
}

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function JourneyView({ repo, onStepClick }: JourneyViewProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  const [journey, setJourney] = useState<JourneyFlow | null>(null)
  const [features, setFeatures] = useState<FeatureOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTechnical, setShowTechnical] = useState(false)

  // 기능 목록 로드
  useEffect(() => {
    async function loadFeatures() {
      try {
        const res = await fetch(`/api/logic-flow/journey?repo=${encodeURIComponent(repo)}`)
        if (res.ok) {
          const data = await res.json()
          setFeatures(data.features || getDefaultFeatures())
        } else {
          setFeatures(getDefaultFeatures())
        }
      } catch {
        setFeatures(getDefaultFeatures())
      }
    }

    if (repo) {
      loadFeatures()
    }
  }, [repo])

  // 기본 기능 목록 (API 미지원 시 fallback)
  function getDefaultFeatures(): FeatureOption[] {
    return [
      { id: 'login', label: '로그인', description: '사용자 인증 흐름' },
      { id: 'signup', label: '회원가입', description: '새 계정 생성' },
      { id: 'visualization', label: '코드 시각화', description: '다이어그램 생성' },
    ]
  }

  // Mock 여정 데이터 생성 (API 미구현 시)
  const createMockJourney = useCallback((featureId: string): JourneyFlow => {
    const featureNames: Record<string, string> = {
      login: '로그인',
      signup: '회원가입',
      visualization: '코드 시각화',
    }

    const featureSteps: Record<string, JourneyStep[]> = {
      login: [
        { order: 1, action: '로그인 버튼 클릭', technical: 'handleLoginClick()', type: 'user' },
        { order: 2, action: '입력값 검증', technical: 'validateInput()', type: 'logic' },
        { order: 3, action: '서버에 로그인 요청', technical: 'POST /api/auth', type: 'api' },
        { order: 4, action: '토큰 저장', technical: 'setSession()', type: 'data' },
        { order: 5, action: '대시보드로 이동', technical: 'router.push()', type: 'logic' },
      ],
      signup: [
        { order: 1, action: '회원가입 폼 제출', technical: 'handleSignupSubmit()', type: 'user' },
        { order: 2, action: '이메일/비밀번호 검증', technical: 'validateForm()', type: 'logic' },
        { order: 3, action: '서버에 계정 생성 요청', technical: 'POST /api/auth/signup', type: 'api' },
        { order: 4, action: '사용자 정보 저장', technical: 'supabase.insert()', type: 'data' },
        { order: 5, action: '로그인 페이지로 이동', technical: 'router.push("/login")', type: 'logic' },
      ],
      visualization: [
        { order: 1, action: '레포지토리 선택', technical: 'handleRepoSelect()', type: 'user' },
        { order: 2, action: '코드 분석 요청', technical: 'POST /api/logic-flow/analyze', type: 'api' },
        { order: 3, action: 'AST 파싱', technical: 'analyzeAST()', type: 'logic' },
        { order: 4, action: '의존성 그래프 생성', technical: 'buildGraph()', type: 'logic' },
        { order: 5, action: '다이어그램 렌더링', technical: 'MermaidDiagram.render()', type: 'logic' },
      ],
    }

    const steps = featureSteps[featureId] || featureSteps.login
    const name = featureNames[featureId] || featureId

    return {
      id: `journey:${featureId}`,
      name: featureId,
      displayName: `${name} 흐름`,
      description: `사용자가 ${name}할 때 시스템이 처리하는 과정입니다.`,
      trigger: {
        type: 'click',
        element: name,
        displayLabel: `${name} 버튼 클릭`,
      },
      steps,
      outcomes: [
        { type: 'success', label: 'success', displayLabel: '성공', condition: '정상 처리 시' },
        { type: 'error', label: 'error', displayLabel: '에러 발생', condition: '오류 발생 시' },
      ],
      mermaid: generateMermaid(steps, name),
    }
  }, [])

  // 여정 분석 요청
  const analyzeJourney = useCallback(async (featureId: string) => {
    setLoading(true)
    setError(null)
    setJourney(null)

    try {
      const res = await fetch('/api/logic-flow/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          feature: featureId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '분석 실패')
      }

      const data = await res.json()
      setJourney(data.journey || createMockJourney(featureId))
    } catch (err) {
      const error = err as Error
      setError(error.message)
      // Mock 데이터로 fallback
      setJourney(createMockJourney(featureId))
    } finally {
      setLoading(false)
    }
  }, [repo, createMockJourney])

  // Mermaid 시퀀스 다이어그램 생성
  function generateMermaid(steps: JourneyStep[], name: string): string {
    const lines: string[] = ['sequenceDiagram']

    // 참여자 정의
    lines.push('    participant 사용자 as 👤 사용자')
    lines.push('    participant UI as 🖥️ 화면')
    lines.push('    participant 로직 as ⚙️ 처리')
    lines.push('    participant API as 🌐 서버')
    lines.push('    participant DB as 💾 저장소')

    lines.push('')

    // 메시지 흐름
    let lastParticipant = '사용자'
    for (const step of steps) {
      const target = step.type === 'user' ? 'UI' :
                    step.type === 'logic' ? '로직' :
                    step.type === 'api' ? 'API' : 'DB'

      const action = step.action.replace(/"/g, "'")
      lines.push(`    ${lastParticipant}->>+${target}: ${action}`)
      lastParticipant = target
    }

    // 결과
    lines.push('')
    lines.push(`    Note right of 사용자: ${name} 완료`)

    return lines.join('\n')
  }

  // 기능 선택 핸들러
  function handleFeatureSelect(featureId: string) {
    setSelectedFeature(featureId)
    analyzeJourney(featureId)
  }

  return (
    <div data-testid="journey-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 헤더 */}
      <div style={{
        padding: '20px',
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#1e293b' }}>
              📖 기능 흐름
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              이 기능이 어떻게 작동하는지 단계별로 확인하세요
            </p>
          </div>

          {/* 기술 용어 토글 */}
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            style={{
              padding: '8px 16px',
              background: showTechnical ? '#3b82f6' : '#f1f5f9',
              color: showTechnical ? '#fff' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {showTechnical ? '👨‍💻 개발자 모드' : '👤 비개발자 모드'}
          </button>
        </div>

        {/* 기능 선택 */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => handleFeatureSelect(feature.id)}
              style={{
                padding: '10px 16px',
                background: selectedFeature === feature.id ? '#3b82f6' : '#f8fafc',
                color: selectedFeature === feature.id ? '#fff' : '#1e293b',
                border: `1px solid ${selectedFeature === feature.id ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {feature.label}
            </button>
          ))}
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
          <p>기능 흐름 분석 중...</p>
        </div>
      )}

      {/* 에러 (하지만 fallback 데이터 있음) */}
      {error && journey && (
        <div style={{
          padding: '12px 16px',
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          color: '#92400e',
          fontSize: '13px',
        }}>
          ⚠️ API 분석 실패, 예시 데이터로 표시합니다: {error}
        </div>
      )}

      {/* 여정 표시 */}
      {!loading && journey && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* 왼쪽: 단계 목록 */}
          <div style={{
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#1e293b' }}>
              {journey.displayName}
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
              {journey.description}
            </p>

            {/* 단계 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {journey.steps.map((step, idx) => {
                const colors = STEP_COLORS[step.type]
                return (
                  <div
                    key={idx}
                    onClick={() => onStepClick?.(step)}
                    style={{
                      padding: '16px',
                      background: colors.bg,
                      border: `2px solid ${colors.border}`,
                      borderRadius: '10px',
                      cursor: onStepClick ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (onStepClick) {
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '20px' }}>
                        {NUMBER_EMOJIS[idx] || `${idx + 1}.`}
                      </span>
                      <span style={{ fontSize: '20px' }}>
                        {STEP_ICONS[step.type]}
                      </span>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>
                        {step.action}
                      </span>
                    </div>

                    {/* 기술 용어 (토글 시에만 표시) */}
                    {showTechnical && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.7)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#64748b',
                        fontFamily: 'monospace',
                      }}>
                        <code>{step.technical}</code>
                        {step.file && (
                          <span style={{ marginLeft: '8px', color: '#94a3b8' }}>
                            @ {step.file}:{step.line}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 결과 */}
            <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
              <h5 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>
                결과
              </h5>
              <div style={{ display: 'flex', gap: '12px' }}>
                {journey.outcomes.map((outcome, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 16px',
                      background: outcome.type === 'success' ? '#dcfce7' :
                                 outcome.type === 'error' ? '#fef2f2' : '#dbeafe',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: outcome.type === 'success' ? '#166534' :
                             outcome.type === 'error' ? '#dc2626' : '#1d4ed8',
                    }}
                  >
                    {outcome.type === 'success' ? '✅' :
                     outcome.type === 'error' ? '❌' : '➡️'} {outcome.displayLabel}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 시퀀스 다이어그램 */}
          <div style={{
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#1e293b' }}>
              📊 흐름 다이어그램
            </h4>

            {journey.mermaid && (
              <MermaidDiagram
                chart={journey.mermaid}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Object.entries(STEP_ICONS).map(([type, icon]) => {
                  const labels: Record<string, string> = {
                    user: '사용자 액션',
                    logic: '처리 로직',
                    api: '서버 통신',
                    data: '데이터 저장',
                  }
                  const colors = STEP_COLORS[type as JourneyStep['type']]
                  return (
                    <div
                      key={type}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <span style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '4px',
                      }}>
                        {icon}
                      </span>
                      <span style={{ color: '#64748b' }}>{labels[type]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 선택 안됨 상태 */}
      {!loading && !journey && !selectedFeature && (
        <div style={{
          padding: '60px',
          background: '#fff',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
          <p style={{ margin: 0, fontSize: '15px' }}>
            위에서 기능을 선택하면 동작 흐름을 확인할 수 있습니다
          </p>
        </div>
      )}
    </div>
  )
}
