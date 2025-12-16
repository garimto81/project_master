'use client'

/**
 * StepPlayer - 스텝바이스텝 실행 시각화
 * PRD v6.2 Section 1.2: 스텝바이스텝 실행 모드
 *
 * 코드 실행 흐름을 애니메이션으로 표시
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import MermaidDiagram from '../MermaidDiagram'

interface Step {
  order: number
  node: string
  label: string
  type: 'start' | 'action' | 'decision' | 'process' | 'end' | 'error'
  data: Record<string, any> | null
  source_line?: number
}

interface StepPlayerProps {
  repo: string
  functionName: string
  path?: string
  inputExample?: Record<string, any>
  onStepChange?: (step: Step, index: number) => void
  autoPlay?: boolean
  speed?: 'slow' | 'normal' | 'fast'
}

const SPEED_MS = {
  slow: 2000,
  normal: 1000,
  fast: 500,
}

export default function StepPlayer({
  repo,
  functionName,
  path,
  inputExample,
  onStepChange,
  autoPlay = false,
  speed = 'normal',
}: StepPlayerProps) {
  const [steps, setSteps] = useState<Step[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [mermaidCode, setMermaidCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playSpeed, setPlaySpeed] = useState<'slow' | 'normal' | 'fast'>(speed)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 스텝 데이터 로드
  const loadSteps = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/logic-flow/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          function: functionName,
          path,
          input_example: inputExample,
        }),
      })

      if (!response.ok) throw new Error('Failed to load trace')

      const data = await response.json()
      setSteps(data.steps || [])
      setMermaidCode(data.mermaid_code || '')
      setCurrentStepIndex(0)
    } catch (err) {
      console.error('Load trace error:', err)
      setError('실행 흐름을 불러올 수 없습니다')

      // 폴백 데이터
      setSteps([
        { order: 1, node: 'START', label: '시작', type: 'start', data: null },
        { order: 2, node: 'A', label: '처리', type: 'action', data: null },
        { order: 3, node: 'END', label: '완료', type: 'end', data: null },
      ])
      setMermaidCode(`flowchart TB
  START([시작]):::current
  A[처리]
  END([완료])
  START --> A --> END
  classDef current fill:#3b82f6,color:#fff`)
    } finally {
      setLoading(false)
    }
  }, [repo, functionName, path, inputExample])

  useEffect(() => {
    loadSteps()
  }, [loadSteps])

  // 현재 스텝에 맞춰 다이어그램 업데이트
  useEffect(() => {
    if (steps.length === 0) return

    const currentStep = steps[currentStepIndex]
    onStepChange?.(currentStep, currentStepIndex)

    // 현재 노드 하이라이트
    const updatedCode = mermaidCode
      .replace(/:::current/g, '') // 기존 하이라이트 제거
      .replace(
        new RegExp(`${currentStep.node}(\\[|\\{|\\()`),
        `${currentStep.node}:::current$1`
      )

    // classDef가 없으면 추가
    if (!updatedCode.includes('classDef current')) {
      setMermaidCode(updatedCode + '\n  classDef current fill:#3b82f6,color:#fff,stroke:#1d4ed8,stroke-width:3px')
    } else {
      setMermaidCode(updatedCode)
    }
  }, [currentStepIndex, steps])

  // 자동 재생
  useEffect(() => {
    if (isPlaying && steps.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, SPEED_MS[playSpeed])
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, playSpeed, steps.length])

  // 컨트롤 핸들러
  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handlePrev = () => setCurrentStepIndex((prev) => Math.max(0, prev - 1))
  const handleNext = () => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))
  const handleFirst = () => setCurrentStepIndex(0)
  const handleLast = () => setCurrentStepIndex(steps.length - 1)

  const currentStep = steps[currentStepIndex]

  return (
    <div data-testid="step-player" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 헤더 */}
      <div style={{
        padding: '12px 16px',
        background: '#f8fafc',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 500 }}>
          📽️ {functionName} 실행 흐름
        </span>
        <span style={{ fontSize: '14px', color: '#64748b' }}>
          {currentStepIndex + 1} / {steps.length} 단계
        </span>
      </div>

      {/* 로딩/에러 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          실행 흐름 분석 중...
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* 다이어그램 */}
      {!loading && (
        <div style={{ position: 'relative' }}>
          <MermaidDiagram chart={mermaidCode} id="step-player-diagram" />
        </div>
      )}

      {/* 컨트롤 패널 */}
      {!loading && steps.length > 0 && (
        <div style={{
          padding: '16px',
          background: '#1e293b',
          borderRadius: '12px',
          color: '#fff',
        }}>
          {/* 컨트롤 버튼 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <button
              onClick={handleFirst}
              data-testid="btn-first"
              disabled={currentStepIndex === 0}
              style={controlButtonStyle(currentStepIndex === 0)}
            >
              ⏮️
            </button>
            <button
              onClick={handlePrev}
              data-testid="btn-prev"
              disabled={currentStepIndex === 0}
              style={controlButtonStyle(currentStepIndex === 0)}
            >
              ◀️
            </button>
            {isPlaying ? (
              <button
                onClick={handlePause}
                data-testid="btn-pause"
                style={{ ...controlButtonStyle(false), background: '#3b82f6', padding: '12px 24px' }}
              >
                ⏸️
              </button>
            ) : (
              <button
                onClick={handlePlay}
                data-testid="btn-play"
                disabled={currentStepIndex === steps.length - 1}
                style={{ ...controlButtonStyle(currentStepIndex === steps.length - 1), background: '#22c55e', padding: '12px 24px' }}
              >
                ▶️
              </button>
            )}
            <button
              onClick={handleNext}
              data-testid="btn-next"
              disabled={currentStepIndex === steps.length - 1}
              style={controlButtonStyle(currentStepIndex === steps.length - 1)}
            >
              ▶️
            </button>
            <button
              onClick={handleLast}
              data-testid="btn-last"
              disabled={currentStepIndex === steps.length - 1}
              style={controlButtonStyle(currentStepIndex === steps.length - 1)}
            >
              ⏭️
            </button>
          </div>

          {/* 속도 조절 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '14px' }}>🐢</span>
            <input
              type="range"
              min={0}
              max={2}
              value={playSpeed === 'slow' ? 0 : playSpeed === 'normal' ? 1 : 2}
              onChange={(e) => {
                const speeds: ('slow' | 'normal' | 'fast')[] = ['slow', 'normal', 'fast']
                setPlaySpeed(speeds[parseInt(e.target.value)])
              }}
              style={{ width: '100px' }}
              data-testid="speed-slider"
            />
            <span style={{ fontSize: '14px' }}>🐇</span>
          </div>

          {/* 현재 스텝 정보 */}
          {currentStep && (
            <div style={{
              padding: '16px',
              background: '#334155',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '12px',
                color: '#94a3b8',
                marginBottom: '4px',
              }}>
                {currentStep.type === 'start' ? '시작' :
                 currentStep.type === 'end' ? '종료' :
                 currentStep.type === 'error' ? '에러' :
                 currentStep.type === 'decision' ? '조건 분기' : '실행 중'}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 500,
                color: currentStep.type === 'error' ? '#f87171' :
                       currentStep.type === 'end' ? '#4ade80' : '#fff',
              }}>
                {stepTypeIcon(currentStep.type)} {currentStep.label}
              </div>
              {currentStep.data && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                }}>
                  {JSON.stringify(currentStep.data, null, 2).slice(0, 100)}
                </div>
              )}
              {currentStep.source_line && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#64748b',
                }}>
                  📍 Line {currentStep.source_line}
                </div>
              )}
            </div>
          )}

          {/* 다음 스텝 미리보기 */}
          {currentStepIndex < steps.length - 1 && (
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#64748b',
              textAlign: 'center',
            }}>
              다음: {steps[currentStepIndex + 1].label}
            </div>
          )}
        </div>
      )}

      {/* 프로그레스 바 */}
      {!loading && steps.length > 0 && (
        <div style={{
          height: '4px',
          background: '#e2e8f0',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div
            style={{
              width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
              height: '100%',
              background: '#3b82f6',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  )
}

function controlButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    fontSize: '16px',
    background: disabled ? '#475569' : '#64748b',
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s',
  }
}

function stepTypeIcon(type: Step['type']): string {
  switch (type) {
    case 'start': return '🟢'
    case 'action': return '⚙️'
    case 'decision': return '❓'
    case 'process': return '🔄'
    case 'end': return '🏁'
    case 'error': return '❌'
    default: return '▶️'
  }
}
