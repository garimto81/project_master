'use client'

/**
 * DbNode - 데이터베이스 노드
 * PRD-0007 Phase 4
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface DbNodeData {
  table: string
  operations: string[]
}

const OP_ICONS: Record<string, string> = {
  select: '📖',
  insert: '➕',
  update: '✏️',
  delete: '🗑️',
  upsert: '🔄',
  rpc: '⚡',
  auth: '🔐',
}

export const DbNode = memo(({ data }: NodeProps<DbNodeData>) => {
  const uniqueOps = [...new Set(data.operations)]

  return (
    <div
      style={{
        padding: '10px 14px',
        background: '#fff',
        border: '2px solid #f59e0b',
        borderRadius: '8px',
        minWidth: '120px',
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#f59e0b', width: 8, height: 8 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '16px' }}>🗄️</span>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e' }}>
          {data.table}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {uniqueOps.slice(0, 4).map((op) => (
          <span
            key={op}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              background: '#fef3c7',
              borderRadius: '4px',
              color: '#92400e',
            }}
          >
            {OP_ICONS[op] || '📄'} {op}
          </span>
        ))}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#f59e0b', width: 8, height: 8 }}
      />
    </div>
  )
})

DbNode.displayName = 'DbNode'
