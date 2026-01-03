'use client'

/**
 * FunctionNode - 함수/컴포넌트 노드
 * PRD-0007 Phase 4
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface FunctionNodeData {
  label: string
  layer: string
  type: 'function' | 'method' | 'arrow' | 'component' | 'hook' | 'handler'
  functionCount: number
  isApiRoute?: boolean
  hasSupabase?: boolean
  isHotspot?: boolean
}

const TYPE_ICONS: Record<string, string> = {
  component: '🧩',
  hook: '🪝',
  handler: '⚡',
  function: '𝑓',
  method: '📌',
  arrow: '➜',
}

const LAYER_COLORS: Record<string, { bg: string; border: string }> = {
  ui: { bg: '#dbeafe', border: '#3b82f6' },
  logic: { bg: '#dcfce7', border: '#22c55e' },
  api: { bg: '#ffedd5', border: '#f97316' },
  data: { bg: '#e0e7ff', border: '#6366f1' },
  lib: { bg: '#fef3c7', border: '#f59e0b' },
  unknown: { bg: '#f3f4f6', border: '#6b7280' },
}

export const FunctionNode = memo(({ data }: NodeProps<FunctionNodeData>) => {
  const icon = TYPE_ICONS[data.type] || '📄'
  const colors = LAYER_COLORS[data.layer] || LAYER_COLORS.unknown

  return (
    <div
      style={{
        padding: '8px 12px',
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        minWidth: '100px',
        boxShadow: data.isHotspot ? `0 0 12px ${colors.border}` : '0 1px 4px rgba(0,0,0,0.1)',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: colors.border, width: 8, height: 8 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '14px' }}>{icon}</span>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>
          {data.label}
        </div>
      </div>

      {data.functionCount > 0 && (
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
          호출 {data.functionCount}회
        </div>
      )}

      {/* 배지 */}
      <div style={{ position: 'absolute', top: '-8px', right: '-8px', display: 'flex', gap: '2px' }}>
        {data.isApiRoute && (
          <span
            style={{
              fontSize: '10px',
              background: '#3b82f6',
              color: '#fff',
              padding: '1px 4px',
              borderRadius: '4px',
            }}
          >
            API
          </span>
        )}
        {data.hasSupabase && (
          <span
            style={{
              fontSize: '10px',
              background: '#f59e0b',
              color: '#fff',
              padding: '1px 4px',
              borderRadius: '4px',
            }}
          >
            DB
          </span>
        )}
        {data.isHotspot && (
          <span
            style={{
              fontSize: '10px',
              background: '#ef4444',
              color: '#fff',
              padding: '1px 4px',
              borderRadius: '4px',
            }}
          >
            🔥
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: colors.border, width: 8, height: 8 }}
      />
    </div>
  )
})

FunctionNode.displayName = 'FunctionNode'
