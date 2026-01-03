'use client'

/**
 * ApiNode - API 엔드포인트 노드
 * PRD-0007 Phase 4
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface ApiNodeData {
  path: string
  method: string
}

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: '#dcfce7', text: '#166534' },
  POST: { bg: '#dbeafe', text: '#1e40af' },
  PUT: { bg: '#fef3c7', text: '#92400e' },
  DELETE: { bg: '#fef2f2', text: '#dc2626' },
  PATCH: { bg: '#f3e8ff', text: '#7c3aed' },
}

export const ApiNode = memo(({ data }: NodeProps<ApiNodeData>) => {
  const colors = METHOD_COLORS[data.method] || METHOD_COLORS.GET

  return (
    <div
      style={{
        padding: '10px 14px',
        background: '#fff',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        minWidth: '140px',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#3b82f6', width: 8, height: 8 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>🌐</span>
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: colors.bg,
              color: colors.text,
              display: 'inline-block',
              marginBottom: '2px',
            }}
          >
            {data.method}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#1e293b',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {data.path}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#3b82f6', width: 8, height: 8 }}
      />
    </div>
  )
})

ApiNode.displayName = 'ApiNode'
