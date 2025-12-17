'use client'

/**
 * InteractiveFlowDiagram - Phase 3 인터랙티브 데이터 흐름 다이어그램
 * PRD v6.2 Level 1-A: 큰 그림 시각화
 *
 * Features:
 * - 레이어별 색상 구분
 * - 클릭 가능한 레이어 박스
 * - 데이터 흐름 애니메이션
 * - 위험 지점 강조
 * - 줌/팬 지원
 */

import { useState, useRef, useEffect } from 'react'

interface Layer {
  name: string
  displayName: string
  modules: string[]
  description: string
}

interface Connection {
  from: string
  to: string
  type: 'call' | 'fetch' | 'import' | 'event'
  label?: string
}

interface RiskPoint {
  location: string
  function: string
  risk: 'high' | 'medium' | 'low'
  reason: string
}

interface Issue {
  number: number
  title: string
  related_layer?: string
}

interface InteractiveFlowDiagramProps {
  layers: Layer[]
  connections: Connection[]
  riskPoints?: RiskPoint[]
  issues?: Issue[]
  onLayerClick?: (layer: Layer) => void
  onModuleClick?: (moduleName: string, layer: Layer) => void
}

// 레이어별 색상 테마
const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; light: string }> = {
  ui: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', light: '#eff6ff' },
  logic: { bg: '#dcfce7', border: '#22c55e', text: '#166534', light: '#f0fdf4' },
  server: { bg: '#ffedd5', border: '#f97316', text: '#9a3412', light: '#fff7ed' },
  data: { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3', light: '#eef2ff' },
}

// 레이어 아이콘
const LAYER_ICONS: Record<string, string> = {
  ui: '🖥️',
  logic: '⚙️',
  server: '🌐',
  data: '💾',
}

export default function InteractiveFlowDiagram({
  layers,
  connections,
  riskPoints = [],
  issues = [],
  onLayerClick,
  onModuleClick,
}: InteractiveFlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null)
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null)

  // 레이어에 관련된 위험 지점 수
  const getRiskCount = (layerName: string) => {
    return riskPoints.filter(r => {
      const loc = r.location.toLowerCase()
      if (layerName === 'ui') return loc.includes('component') || loc.includes('page')
      if (layerName === 'server') return loc.includes('api') || loc.includes('route')
      if (layerName === 'data') return loc.includes('store') || loc.includes('model')
      return loc.includes('lib') || loc.includes('util')
    }).length
  }

  // 레이어에 관련된 이슈 수
  const getIssueCount = (layerName: string) => {
    return issues.filter(i => i.related_layer === layerName).length
  }

  // 줌 핸들러
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 2))
  }

  // 팬 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 리셋
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // 레이어 위치 계산
  const getLayerPosition = (index: number, total: number) => {
    const baseY = 80
    const spacing = 140
    return { x: 50, y: baseY + index * spacing }
  }

  return (
    <div
      ref={containerRef}
      data-testid="interactive-flow-diagram"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '500px',
        background: '#fafafa',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 컨트롤 버튼 */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          −
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '0 12px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          리셋
        </button>
      </div>

      {/* 줌 레벨 표시 */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          fontSize: '12px',
          color: '#64748b',
          background: 'rgba(255,255,255,0.9)',
          padding: '4px 8px',
          borderRadius: '4px',
        }}
      >
        {Math.round(zoom * 100)}%
      </div>

      {/* 메인 캔버스 */}
      <div
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center',
          padding: '24px',
          minHeight: '100%',
        }}
      >
        {/* 사용자 진입점 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              background: '#fff',
              borderRadius: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <span style={{ fontSize: '24px' }}>👤</span>
            <div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>사용자</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>행동 / 입력</div>
            </div>
          </div>
        </div>

        {/* 화살표 (사용자 → UI) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '24px', color: '#94a3b8' }}>↓</div>
        </div>

        {/* 레이어들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {layers.map((layer, index) => {
            const colors = LAYER_COLORS[layer.name] || LAYER_COLORS.logic
            const icon = LAYER_ICONS[layer.name] || '📦'
            const riskCount = getRiskCount(layer.name)
            const issueCount = getIssueCount(layer.name)
            const isHovered = hoveredLayer === layer.name
            const isExpanded = expandedLayer === layer.name

            return (
              <div key={layer.name}>
                {/* 레이어 박스 */}
                <div
                  data-testid={`layer-${layer.name}`}
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedLayer(null)
                    } else {
                      setExpandedLayer(layer.name)
                    }
                    onLayerClick?.(layer)
                  }}
                  onMouseEnter={() => setHoveredLayer(layer.name)}
                  onMouseLeave={() => setHoveredLayer(null)}
                  style={{
                    padding: '16px 20px',
                    background: isHovered ? colors.bg : colors.light,
                    border: `2px solid ${isHovered ? colors.border : '#e2e8f0'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isHovered ? `0 4px 12px ${colors.border}40` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: colors.text, fontSize: '16px' }}>
                          {layer.displayName}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {layer.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* 모듈 수 */}
                      <div
                        style={{
                          padding: '4px 10px',
                          background: colors.bg,
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: colors.text,
                          fontWeight: 500,
                        }}
                      >
                        {layer.modules.length}개 모듈
                      </div>

                      {/* 이슈 배지 */}
                      {issueCount > 0 && (
                        <div
                          style={{
                            padding: '4px 10px',
                            background: '#fef2f2',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#dc2626',
                            fontWeight: 500,
                          }}
                        >
                          🔴 이슈 {issueCount}
                        </div>
                      )}

                      {/* 위험 배지 */}
                      {riskCount > 0 && (
                        <div
                          style={{
                            padding: '4px 10px',
                            background: '#fffbeb',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#d97706',
                            fontWeight: 500,
                          }}
                        >
                          ⚠️ {riskCount}
                        </div>
                      )}

                      {/* 확장 아이콘 */}
                      <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {/* 확장된 모듈 목록 */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: `1px solid ${colors.border}40`,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                        gap: '8px',
                      }}
                    >
                      {layer.modules.map((mod) => (
                        <button
                          key={mod}
                          onClick={(e) => {
                            e.stopPropagation()
                            onModuleClick?.(mod, layer)
                          }}
                          style={{
                            padding: '8px 12px',
                            background: '#fff',
                            border: `1px solid ${colors.border}60`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: colors.text,
                            textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.bg
                            e.currentTarget.style.borderColor = colors.border
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff'
                            e.currentTarget.style.borderColor = `${colors.border}60`
                          }}
                        >
                          {mod}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 화살표 (레이어 간) */}
                {index < layers.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: '20px', color: '#94a3b8' }}>↓</div>
                      {connections.find(c => c.from === layer.name) && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '-4px' }}>
                          {connections.find(c => c.from === layer.name)?.label}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 범례 */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '12px' }}>
            범례
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {Object.entries(LAYER_COLORS).map(([name, colors]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    background: colors.bg,
                    border: `2px solid ${colors.border}`,
                    borderRadius: '4px',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {name === 'ui' ? '화면' : name === 'logic' ? '처리' : name === 'server' ? '서버' : '저장'}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔴</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>이슈 있음</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>위험 지점</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
