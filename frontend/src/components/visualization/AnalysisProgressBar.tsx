'use client'

/**
 * AnalysisProgressBar - 코드 분석 진행률 표시
 * PRD-0007 Phase 5: Progress Bar (#40)
 */

import { useEffect, useState } from 'react'

export type AnalysisStage = 'fetching' | 'scanning' | 'analyzing' | 'building' | 'complete' | 'error'

interface AnalysisProgressBarProps {
  stage: AnalysisStage
  percent: number
  message?: string
  filesProcessed?: number
  totalFiles?: number
  error?: string
  onCancel?: () => void  // 취소 콜백
}

// 단계별 설정
const STAGE_CONFIG: Record<AnalysisStage, { icon: string; label: string; color: string }> = {
  fetching: { icon: '📥', label: '파일 목록 가져오는 중', color: '#3b82f6' },
  scanning: { icon: '🔍', label: '분석할 파일 찾는 중', color: '#8b5cf6' },
  analyzing: { icon: '📊', label: '코드 구조 분석 중', color: '#f59e0b' },
  building: { icon: '🔧', label: '다이어그램 생성 중', color: '#22c55e' },
  complete: { icon: '✅', label: '분석 완료', color: '#22c55e' },
  error: { icon: '❌', label: '분석 실패', color: '#ef4444' },
}

export function AnalysisProgressBar({
  stage,
  percent,
  message,
  filesProcessed,
  totalFiles,
  error,
  onCancel,
}: AnalysisProgressBarProps) {
  const [showTip, setShowTip] = useState(false)
  const config = STAGE_CONFIG[stage]

  // 10초 후 팁 표시
  useEffect(() => {
    if (stage !== 'complete' && stage !== 'error') {
      const timer = setTimeout(() => setShowTip(true), 10000)
      return () => clearTimeout(timer)
    }
  }, [stage])

  return (
    <div
      data-testid="analysis-progress-bar"
      style={{
        padding: '24px',
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* 진행률 바 */}
      <div
        style={{
          height: '8px',
          background: '#e2e8f0',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(percent, 100)}%`,
            background: config.color,
            borderRadius: '4px',
            transition: 'width 0.3s ease, background 0.3s ease',
          }}
        />
      </div>

      {/* 상태 표시 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px' }}>{config.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>
            {config.label} {stage !== 'complete' && stage !== 'error' && `(${Math.round(percent)}%)`}
          </div>
          {message && (
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* 파일 진행 상황 */}
      {filesProcessed !== undefined && totalFiles !== undefined && totalFiles > 0 && (
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
          📁 {filesProcessed} / {totalFiles} 파일 처리됨
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: '#fef2f2',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* 대기 팁 */}
      {showTip && stage !== 'complete' && stage !== 'error' && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: '#fffbeb',
            borderRadius: '8px',
            color: '#92400e',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>💡</span>
          <span>프로젝트가 크면 분석에 시간이 더 걸릴 수 있습니다.</span>
        </div>
      )}

      {/* 취소 버튼 */}
      {onCancel && stage !== 'complete' && stage !== 'error' && (
        <button
          onClick={onCancel}
          data-testid="analysis-cancel-btn"
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0'
            e.currentTarget.style.color = '#475569'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9'
            e.currentTarget.style.color = '#64748b'
          }}
        >
          분석 취소
        </button>
      )}

      {/* 단계 인디케이터 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        {(['fetching', 'scanning', 'analyzing', 'building', 'complete'] as AnalysisStage[]).map(
          (s, index) => {
            const stepConfig = STAGE_CONFIG[s]
            const isActive = s === stage
            const isPast = getStageOrder(s) < getStageOrder(stage)
            const isFuture = getStageOrder(s) > getStageOrder(stage)

            return (
              <div
                key={s}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: isFuture ? 0.4 : 1,
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isPast || isActive ? stepConfig.color : '#e2e8f0',
                    color: isPast || isActive ? '#fff' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isPast ? '✓' : index + 1}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: isActive ? stepConfig.color : '#94a3b8',
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'center',
                    maxWidth: '60px',
                  }}
                >
                  {getShortLabel(s)}
                </div>
              </div>
            )
          }
        )}
      </div>
    </div>
  )
}

function getStageOrder(stage: AnalysisStage): number {
  const order: Record<AnalysisStage, number> = {
    fetching: 0,
    scanning: 1,
    analyzing: 2,
    building: 3,
    complete: 4,
    error: -1,
  }
  return order[stage]
}

function getShortLabel(stage: AnalysisStage): string {
  const labels: Record<AnalysisStage, string> = {
    fetching: '파일 가져오기',
    scanning: '파일 찾기',
    analyzing: '분석',
    building: '생성',
    complete: '완료',
    error: '오류',
  }
  return labels[stage]
}

export default AnalysisProgressBar
