'use client'

/**
 * LayerNode - 레이어 그룹 노드
 * PRD-0007 Phase 4
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface LayerNodeData {
  layer: string
  label: string
  fileCount: number
  functionCount: number
  colors: {
    bg: string
    border: string
    text: string
  }
}

const LAYER_ICONS: Record<string, string> = {
  ui: '🖥️',
  logic: '⚙️',
  api: '🌐',
  data: '💾',
  lib: '📚',
  unknown: '📦',
}

export const LayerNode = memo(({ data }: NodeProps<LayerNodeData>) => {
  const icon = LAYER_ICONS[data.layer] || '📦'

  return (
    <div
      style={{
        padding: '12px 16px',
        background: data.colors.bg,
        border: `2px solid ${data.colors.border}`,
        borderRadius: '12px',
        minWidth: '180px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: data.colors.border }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <div style={{ fontWeight: 600, color: data.colors.text, fontSize: '14px' }}>
          {data.label}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
        <span>{data.fileCount} 파일</span>
        <span>{data.functionCount} 함수</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: data.colors.border }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: data.colors.border }}
      />
    </div>
  )
})

LayerNode.displayName = 'LayerNode'
