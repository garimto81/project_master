'use client'

/**
 * VirtualizedDiagram - 가상화된 다이어그램
 * 대규모 다이어그램에서 뷰포트 내 노드만 렌더링
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { AnalysisResult, ModuleInfo, Connection } from '@/lib/types'
import { LAYER_COLORS_EXTENDED, LAYER_NAMES, LayerType } from '@/lib/colors'

interface VirtualizedDiagramProps {
  analysisResult: AnalysisResult
  width?: number
  height?: number
  nodeSize?: { width: number; height: number }
  onNodeClick?: (module: ModuleInfo) => void
  onConnectionClick?: (connection: Connection) => void
}

interface ViewportBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface NodePosition {
  id: string
  x: number
  y: number
  module: ModuleInfo
  layer: LayerType
}

interface EdgePosition {
  id: string
  from: NodePosition
  to: NodePosition
  connection: Connection
}

export function VirtualizedDiagram({
  analysisResult,
  width = 800,
  height = 600,
  nodeSize = { width: 150, height: 60 },
  onNodeClick,
  onConnectionClick,
}: VirtualizedDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<ViewportBounds>({
    minX: 0,
    maxX: width,
    minY: 0,
    maxY: height,
  })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // 노드 위치 계산 (레이어별로 배치)
  const nodePositions = useMemo((): NodePosition[] => {
    const positions: NodePosition[] = []
    const layerOrder: LayerType[] = ['ui', 'logic', 'api', 'server', 'data', 'lib', 'unknown']
    const padding = 50
    const layerHeight = (height - padding * 2) / layerOrder.length

    analysisResult.layers.forEach((layer) => {
      const layerIndex = layerOrder.indexOf(layer.type as LayerType)
      const y = padding + layerIndex * layerHeight + layerHeight / 2

      layer.modules.forEach((module, moduleIndex) => {
        const modulesInLayer = layer.modules.length
        const spacing = (width - padding * 2) / (modulesInLayer + 1)
        const x = padding + spacing * (moduleIndex + 1)

        positions.push({
          id: module.path,
          x,
          y,
          module,
          layer: layer.type as LayerType,
        })
      })
    })

    return positions
  }, [analysisResult, width, height])

  // 엣지 위치 계산
  const edgePositions = useMemo((): EdgePosition[] => {
    const nodeMap = new Map(nodePositions.map(n => [n.id, n]))

    return analysisResult.connections
      .map(conn => {
        const from = nodeMap.get(conn.from)
        const to = nodeMap.get(conn.to)
        if (!from || !to) return null

        return {
          id: `${conn.from}->${conn.to}`,
          from,
          to,
          connection: conn,
        }
      })
      .filter((e): e is EdgePosition => e !== null)
  }, [analysisResult.connections, nodePositions])

  // 뷰포트 내 노드 필터링
  const visibleNodes = useMemo(() => {
    const buffer = 100 // 버퍼 영역

    return nodePositions.filter(node => {
      const nodeX = (node.x + pan.x) * zoom
      const nodeY = (node.y + pan.y) * zoom

      return (
        nodeX + nodeSize.width >= viewport.minX - buffer &&
        nodeX <= viewport.maxX + buffer &&
        nodeY + nodeSize.height >= viewport.minY - buffer &&
        nodeY <= viewport.maxY + buffer
      )
    })
  }, [nodePositions, viewport, zoom, pan, nodeSize])

  // 뷰포트 내 엣지 필터링
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id))

    return edgePositions.filter(edge =>
      visibleNodeIds.has(edge.from.id) || visibleNodeIds.has(edge.to.id)
    )
  }, [edgePositions, visibleNodes])

  // 뷰포트 업데이트
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateViewport = () => {
      const rect = container.getBoundingClientRect()
      setViewport({
        minX: 0,
        maxX: rect.width,
        minY: 0,
        maxY: rect.height,
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta))
    setZoom(newZoom)
  }, [zoom])

  const handleNodeClick = useCallback((node: NodePosition) => {
    setSelectedNode(node.id)
    onNodeClick?.(node.module)
  }, [onNodeClick])

  // 화살표 마커 정의
  const ArrowMarker = () => (
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          fill="#9ca3af"
        />
      </marker>
      <marker
        id="arrowhead-circular"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          fill="#ef4444"
        />
      </marker>
    </defs>
  )

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
      style={{ width, height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      data-testid="virtualized-diagram"
    >
      {/* 통계 표시 */}
      <div className="absolute top-2 left-2 z-10 bg-white/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-600">
        표시 중: {visibleNodes.length}/{nodePositions.length} 노드, {visibleEdges.length}/{edgePositions.length} 연결
      </div>

      {/* 줌 컨트롤 */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => setZoom(z => Math.min(3, z * 1.2))}
          className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center hover:bg-gray-50"
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.1, z / 1.2))}
          className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center hover:bg-gray-50"
        >
          -
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
          className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center hover:bg-gray-50 text-xs"
        >
          ⟳
        </button>
      </div>

      {/* SVG 다이어그램 */}
      <svg
        width="100%"
        height="100%"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <ArrowMarker />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 레이어 배경 */}
          {analysisResult.layers.map((layer, index) => {
            const layerHeight = (height - 100) / analysisResult.layers.length
            const y = 50 + index * layerHeight

            return (
              <g key={layer.type}>
                <rect
                  x={25}
                  y={y}
                  width={width - 50}
                  height={layerHeight - 10}
                  fill={LAYER_COLORS_EXTENDED[layer.type as LayerType]?.light || '#f9fafb'}
                  stroke={LAYER_COLORS_EXTENDED[layer.type as LayerType]?.border || '#e5e7eb'}
                  strokeWidth={1}
                  rx={8}
                  opacity={0.5}
                />
                <text
                  x={35}
                  y={y + 20}
                  fill={LAYER_COLORS_EXTENDED[layer.type as LayerType]?.text || '#4b5563'}
                  fontSize={12}
                  fontWeight={500}
                >
                  {LAYER_NAMES[layer.type as LayerType] || layer.name}
                </text>
              </g>
            )
          })}

          {/* 엣지 */}
          {visibleEdges.map(edge => {
            const isCircular = analysisResult.circularDependencies.some(
              cd => cd.cycle.includes(edge.from.id) && cd.cycle.includes(edge.to.id)
            )

            return (
              <line
                key={edge.id}
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                stroke={isCircular ? '#ef4444' : '#9ca3af'}
                strokeWidth={isCircular ? 2 : 1}
                strokeDasharray={isCircular ? '5,5' : 'none'}
                markerEnd={isCircular ? 'url(#arrowhead-circular)' : 'url(#arrowhead)'}
                onClick={() => onConnectionClick?.(edge.connection)}
                style={{ cursor: 'pointer' }}
              />
            )
          })}

          {/* 노드 */}
          {visibleNodes.map(node => {
            const isSelected = selectedNode === node.id
            const colors = LAYER_COLORS_EXTENDED[node.layer]

            return (
              <g
                key={node.id}
                transform={`translate(${node.x - nodeSize.width / 2}, ${node.y - nodeSize.height / 2})`}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  width={nodeSize.width}
                  height={nodeSize.height}
                  fill={colors?.fill || '#f3f4f6'}
                  stroke={isSelected ? '#3b82f6' : colors?.stroke || '#9ca3af'}
                  strokeWidth={isSelected ? 3 : 1}
                  rx={8}
                />
                <text
                  x={nodeSize.width / 2}
                  y={nodeSize.height / 2 - 5}
                  textAnchor="middle"
                  fill={colors?.text || '#4b5563'}
                  fontSize={12}
                  fontWeight={500}
                >
                  {node.module.name.length > 15
                    ? node.module.name.slice(0, 15) + '...'
                    : node.module.name}
                </text>
                <text
                  x={nodeSize.width / 2}
                  y={nodeSize.height / 2 + 12}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize={10}
                >
                  {node.module.functions?.length || 0} 함수
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* 선택된 노드 정보 */}
      {selectedNode && (
        <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-3">
          {(() => {
            const node = nodePositions.find(n => n.id === selectedNode)
            if (!node) return null

            return (
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{node.module.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{node.module.path}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-100">
                      {node.module.dependencies?.length || 0} 의존성
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-100">
                      {node.module.dependents?.length || 0} 참조
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default VirtualizedDiagram
