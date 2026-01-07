'use client'

/**
 * CausalityNode - 인과관계 시각화 노드
 * Issue #60: 다이어그램 인과관계 로직 시각화 개선
 *
 * Features:
 * - 트리거 → 함수 → 효과 체인 시각화
 * - 데이터 흐름 표시
 * - 호버 시 상세 인과관계 표시
 */

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface CausalityNodeData {
  label: string
  displayName: string
  description: string
  layer: string
  triggers: string[]       // 이 함수를 호출하는 트리거
  effects: string[]        // 이 함수가 발생시키는 효과
  dataFlow: string[]       // 데이터 흐름
  inputs: string[]         // 입력 데이터
  outputs: string[]        // 출력 데이터
  isEntry?: boolean        // 진입점 여부
  isTerminal?: boolean     // 종료점 여부
}

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  ui: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', accent: '#60a5fa' },
  logic: { bg: '#dcfce7', border: '#22c55e', text: '#166534', accent: '#4ade80' },
  api: { bg: '#ffedd5', border: '#f97316', text: '#9a3412', accent: '#fb923c' },
  server: { bg: '#ffedd5', border: '#f97316', text: '#9a3412', accent: '#fb923c' },
  data: { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3', accent: '#818cf8' },
  lib: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', accent: '#fbbf24' },
  unknown: { bg: '#f3f4f6', border: '#6b7280', text: '#374151', accent: '#9ca3af' },
}

const LAYER_ICONS: Record<string, string> = {
  ui: '🖥️',
  logic: '⚙️',
  api: '🌐',
  server: '🌐',
  data: '💾',
  lib: '🔧',
  unknown: '📦',
}

export const CausalityNode = memo(({ data }: NodeProps<CausalityNodeData>) => {
  const [showDetail, setShowDetail] = useState(false)

  const colors = LAYER_COLORS[data.layer] || LAYER_COLORS.unknown
  const icon = LAYER_ICONS[data.layer] || '📦'

  const hasTriggers = data.triggers && data.triggers.length > 0
  const hasEffects = data.effects && data.effects.length > 0
  const hasDataFlow = data.dataFlow && data.dataFlow.length > 0

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setShowDetail(true)}
      onMouseLeave={() => setShowDetail(false)}
    >
      {/* 메인 노드 */}
      <div
        style={{
          padding: '12px 16px',
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: '12px',
          minWidth: '160px',
          maxWidth: '220px',
          boxShadow: showDetail
            ? `0 0 16px ${colors.accent}40`
            : '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          transform: showDetail ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        {/* 입력 핸들 (왼쪽) */}
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: colors.border,
            width: 10,
            height: 10,
            border: '2px solid white',
          }}
        />

        {/* 상단 핸들 (트리거 연결용) */}
        {hasTriggers && (
          <Handle
            type="target"
            position={Position.Top}
            id="trigger"
            style={{
              background: '#ef4444',
              width: 8,
              height: 8,
              top: -4,
            }}
          />
        )}

        {/* 헤더: 아이콘 + 제목 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: colors.text,
                lineHeight: 1.3,
              }}
            >
              {data.displayName || data.label}
            </div>
            <div
              style={{
                fontSize: '10px',
                color: '#94a3b8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {data.label}
            </div>
          </div>
        </div>

        {/* 설명 (짧게) */}
        {data.description && (
          <div
            style={{
              fontSize: '11px',
              color: '#64748b',
              lineHeight: 1.4,
              marginBottom: '8px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {data.description}
          </div>
        )}

        {/* 인과관계 인디케이터 */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {hasTriggers && (
            <span
              style={{
                fontSize: '9px',
                background: '#fee2e2',
                color: '#dc2626',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              ⚡ {data.triggers.length}개 트리거
            </span>
          )}
          {hasEffects && (
            <span
              style={{
                fontSize: '9px',
                background: '#dcfce7',
                color: '#16a34a',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              ✨ {data.effects.length}개 효과
            </span>
          )}
          {data.isEntry && (
            <span
              style={{
                fontSize: '9px',
                background: '#dbeafe',
                color: '#2563eb',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              🚀 진입점
            </span>
          )}
        </div>

        {/* 출력 핸들 (오른쪽) */}
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: colors.border,
            width: 10,
            height: 10,
            border: '2px solid white',
          }}
        />

        {/* 하단 핸들 (효과 연결용) */}
        {hasEffects && (
          <Handle
            type="source"
            position={Position.Bottom}
            id="effect"
            style={{
              background: '#22c55e',
              width: 8,
              height: 8,
              bottom: -4,
            }}
          />
        )}
      </div>

      {/* 상세 정보 패널 */}
      {showDetail && (hasTriggers || hasEffects || hasDataFlow) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '12px',
            padding: '14px 16px',
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: '10px',
            fontSize: '12px',
            lineHeight: 1.5,
            minWidth: '240px',
            maxWidth: '320px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {/* 화살표 */}
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid #1e293b',
            }}
          />

          {/* 트리거 */}
          {hasTriggers && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 600, color: '#fca5a5', marginBottom: '4px' }}>
                ⚡ 트리거 (언제 실행?)
              </div>
              {data.triggers.map((trigger, i) => (
                <div key={i} style={{ paddingLeft: '12px', color: '#e2e8f0' }}>
                  • {trigger}
                </div>
              ))}
            </div>
          )}

          {/* 효과 */}
          {hasEffects && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 600, color: '#86efac', marginBottom: '4px' }}>
                ✨ 효과 (무엇을 하나?)
              </div>
              {data.effects.map((effect, i) => (
                <div key={i} style={{ paddingLeft: '12px', color: '#e2e8f0' }}>
                  • {effect}
                </div>
              ))}
            </div>
          )}

          {/* 데이터 흐름 */}
          {hasDataFlow && (
            <div>
              <div style={{ fontWeight: 600, color: '#93c5fd', marginBottom: '4px' }}>
                📊 데이터 흐름
              </div>
              {data.dataFlow.map((flow, i) => (
                <div key={i} style={{ paddingLeft: '12px', color: '#e2e8f0' }}>
                  {flow}
                </div>
              ))}
            </div>
          )}

          {/* 입력/출력 */}
          {(data.inputs?.length > 0 || data.outputs?.length > 0) && (
            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid #475569',
                display: 'flex',
                gap: '16px',
              }}
            >
              {data.inputs?.length > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                    입력
                  </div>
                  {data.inputs.slice(0, 3).map((input, i) => (
                    <div key={i} style={{ fontSize: '11px' }}>
                      → {input}
                    </div>
                  ))}
                </div>
              )}
              {data.outputs?.length > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                    출력
                  </div>
                  {data.outputs.slice(0, 3).map((output, i) => (
                    <div key={i} style={{ fontSize: '11px' }}>
                      ← {output}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

CausalityNode.displayName = 'CausalityNode'
