'use client'

/**
 * FunctionNode - 비개발자 친화적 함수/컴포넌트 노드
 * PRD-0007 Phase 4: 2단 라벨 + Hover 툴팁
 */

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { getFunctionLabel } from '@/lib/function-labels'

interface FunctionNodeData {
  label: string
  layer: string
  type: 'function' | 'method' | 'arrow' | 'component' | 'hook' | 'handler'
  functionCount: number
  isApiRoute?: boolean
  hasSupabase?: boolean
  isHotspot?: boolean
}

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ui: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  logic: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  api: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  data: { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
  lib: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  unknown: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
}

export const FunctionNode = memo(({ data }: NodeProps<FunctionNodeData>) => {
  const [showTooltip, setShowTooltip] = useState(false)

  // 함수명 → 비개발자 친화적 라벨 변환
  const labelInfo = getFunctionLabel(data.label, data.type, data.layer)
  const colors = LAYER_COLORS[data.layer] || LAYER_COLORS.unknown

  return (
    <div
      style={{
        position: 'relative',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 메인 노드 */}
      <div
        style={{
          padding: '10px 14px',
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: '10px',
          minWidth: '120px',
          boxShadow: data.isHotspot
            ? `0 0 12px ${colors.border}`
            : '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          transform: showTooltip ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: colors.border, width: 8, height: 8 }}
        />

        {/* 2단 라벨 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          {/* 아이콘 */}
          <span style={{ fontSize: '18px', lineHeight: 1.2 }}>
            {labelInfo.icon}
          </span>

          {/* 라벨 영역 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 기능명 (메인) */}
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: colors.text,
                lineHeight: 1.3,
              }}
            >
              {labelInfo.displayName}
            </div>

            {/* 기술명 (서브) */}
            <div
              style={{
                fontSize: '10px',
                color: '#94a3b8',
                marginTop: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {labelInfo.technicalName}
            </div>
          </div>
        </div>

        {/* 배지 */}
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            display: 'flex',
            gap: '2px',
          }}
        >
          {data.isApiRoute && (
            <span
              style={{
                fontSize: '9px',
                background: '#3b82f6',
                color: '#fff',
                padding: '2px 5px',
                borderRadius: '4px',
                fontWeight: 500,
              }}
            >
              API
            </span>
          )}
          {data.hasSupabase && (
            <span
              style={{
                fontSize: '9px',
                background: '#f59e0b',
                color: '#fff',
                padding: '2px 5px',
                borderRadius: '4px',
                fontWeight: 500,
              }}
            >
              DB
            </span>
          )}
          {data.isHotspot && (
            <span
              style={{
                fontSize: '9px',
                background: '#ef4444',
                color: '#fff',
                padding: '2px 5px',
                borderRadius: '4px',
              }}
            >
              HOT
            </span>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Right}
          style={{ background: colors.border, width: 8, height: 8 }}
        />
      </div>

      {/* Hover 툴팁 */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '10px 14px',
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: '8px',
            fontSize: '12px',
            lineHeight: 1.5,
            minWidth: '180px',
            maxWidth: '250px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {/* 화살표 */}
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #1e293b',
            }}
          />

          {/* 설명 텍스트 */}
          <div style={{ marginBottom: '6px' }}>{labelInfo.description}</div>

          {/* 추가 정보 */}
          {(data.isApiRoute || data.hasSupabase) && (
            <div
              style={{
                paddingTop: '6px',
                borderTop: '1px solid #475569',
                fontSize: '11px',
                color: '#94a3b8',
              }}
            >
              {data.isApiRoute && <div>서버 API 엔드포인트</div>}
              {data.hasSupabase && <div>데이터베이스 연동</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

FunctionNode.displayName = 'FunctionNode'
