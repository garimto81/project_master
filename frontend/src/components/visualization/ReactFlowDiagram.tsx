'use client'

/**
 * ReactFlowDiagram - React Flow 기반 인터랙티브 다이어그램
 * PRD-0007 Phase 4: 시각화 개선
 * Issue #60: 인과관계 로직 시각화 개선
 *
 * Features:
 * - 레이어 뷰: 코드 구조 시각화
 * - 흐름 뷰: 함수 호출 관계
 * - 인과관계 뷰: 트리거 → 함수 → 효과 체인 (NEW)
 * - 줌/팬/드래그 지원
 * - 커스텀 노드 타입
 * - 미니맵
 */

import { useCallback, useMemo, useEffect, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  ConnectionMode,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { LayerNode } from './nodes/LayerNode'
import { FunctionNode } from './nodes/FunctionNode'
import { ApiNode } from './nodes/ApiNode'
import { DbNode } from './nodes/DbNode'
import { CausalityNode } from './nodes/CausalityNode'
import type { FileAnalysis } from '@/lib/ast-analyzer'
import type { CallGraphResult } from '@/lib/call-graph-analyzer'

// ============================================================
// 타입 정의
// ============================================================

export type ViewMode = 'layer' | 'flow' | 'causality'

// LLM 분석 결과 타입
export interface CausalityData {
  path: string
  fileName: string
  displayName: string
  description: string
  layer: string
  triggers: string[]
  effects: string[]
  dataFlow: string[]
  inputs: string[]
  outputs: string[]
  relatedModules: string[]
}

export interface ReactFlowDiagramProps {
  mode: ViewMode
  // 레이어 뷰용 데이터
  files?: FileAnalysis[]
  // 흐름 뷰용 데이터
  callGraph?: CallGraphResult
  // 인과관계 뷰용 데이터 (Issue #60)
  causalityData?: CausalityData[]
  // 콜백
  onNodeClick?: (nodeId: string, nodeData: unknown) => void
}

// ============================================================
// 커스텀 노드 타입
// ============================================================

const nodeTypes = {
  layer: LayerNode,
  function: FunctionNode,
  api: ApiNode,
  db: DbNode,
  causality: CausalityNode,
}

// ============================================================
// 레이어 색상
// ============================================================

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ui: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  logic: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  api: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  data: { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
  lib: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  unknown: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
}

// ============================================================
// 메인 컴포넌트
// ============================================================

// 내부 Flow 컴포넌트 (ReactFlowProvider 내부에서 사용)
function ReactFlowInner({
  mode,
  files,
  callGraph,
  causalityData,
  onNodeClick,
}: ReactFlowDiagramProps) {
  // 노드와 엣지 생성
  const { initialNodes, initialEdges } = useMemo(() => {
    if (mode === 'layer' && files) {
      return generateLayerView(files)
    }
    if (mode === 'flow' && callGraph) {
      return generateFlowView(callGraph)
    }
    if (mode === 'causality' && causalityData) {
      return generateCausalityView(causalityData)
    }
    return { initialNodes: [], initialEdges: [] }
  }, [mode, files, callGraph, causalityData])

  // useState로 노드/엣지 상태 관리 (초기값으로 바로 설정)
  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)

  // 모드나 데이터가 변경되면 상태 업데이트
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges])

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id, node.data)
    },
    [onNodeClick]
  )

  // 데이터가 없으면 안내 메시지 표시
  if (nodes.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '48px' }}>📊</div>
        <div>다이어그램을 로드 중...</div>
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={(changes) => {
        setNodes((nds) => {
          const updated = [...nds]
          for (const change of changes) {
            if (change.type === 'position' && change.position) {
              const idx = updated.findIndex((n) => n.id === change.id)
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], position: change.position }
              }
            }
          }
          return updated
        })
      }}
      onEdgesChange={() => {}}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      connectionMode={ConnectionMode.Loose}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={2}
    >
      <Background color="#e2e8f0" gap={20} />
      <Controls position="bottom-right" />
      <MiniMap
        nodeColor={(node) => {
          if (node.data?.layer) {
            return LAYER_COLORS[node.data.layer]?.border || '#6b7280'
          }
          return '#6b7280'
        }}
        maskColor="rgba(0, 0, 0, 0.1)"
        style={{ background: '#fff' }}
      />
    </ReactFlow>
  )
}

// 메인 컴포넌트 (ReactFlowProvider로 감싸기)
export function ReactFlowDiagram(props: ReactFlowDiagramProps) {
  return (
    <div
      data-testid="react-flow-diagram"
      style={{ width: '100%', height: '600px', background: '#fafafa' }}
    >
      <ReactFlowProvider>
        <ReactFlowInner {...props} />
      </ReactFlowProvider>
    </div>
  )
}

// ============================================================
// 레이어 뷰 생성
// ============================================================

function generateLayerView(files: FileAnalysis[]): {
  initialNodes: Node[]
  initialEdges: Edge[]
} {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 레이어별 그룹화
  const byLayer: Record<string, FileAnalysis[]> = {
    ui: [],
    logic: [],
    api: [],
    data: [],
    lib: [],
    unknown: [],
  }

  for (const file of files) {
    byLayer[file.layer]?.push(file)
  }

  // 레이어 순서
  const layerOrder = ['ui', 'logic', 'api', 'data', 'lib']
  let yOffset = 0

  for (const layer of layerOrder) {
    const layerFiles = byLayer[layer]
    if (layerFiles.length === 0) continue

    const colors = LAYER_COLORS[layer]

    // 레이어 그룹 노드
    nodes.push({
      id: `layer-${layer}`,
      type: 'layer',
      position: { x: 50, y: yOffset },
      data: {
        layer,
        label: getLayerLabel(layer),
        fileCount: layerFiles.length,
        functionCount: layerFiles.reduce((sum, f) => sum + f.functions.length, 0),
        colors,
      },
    })

    // 파일 노드들 (상위 5개)
    const topFiles = layerFiles
      .sort((a, b) => b.functions.length - a.functions.length)
      .slice(0, 5)

    let xOffset = 300

    for (const file of topFiles) {
      const fileName = file.path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || ''
      const nodeId = `file-${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`

      nodes.push({
        id: nodeId,
        type: 'function',
        position: { x: xOffset, y: yOffset },
        data: {
          label: fileName,
          layer,
          type: file.functions.some((f) => f.type === 'component')
            ? 'component'
            : file.functions.some((f) => f.type === 'hook')
            ? 'hook'
            : 'function',
          functionCount: file.functions.length,
          isApiRoute: file.isApiRoute,
          hasSupabase: file.hasSupabase,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      // 레이어 → 파일 연결
      edges.push({
        id: `e-${layer}-${nodeId}`,
        source: `layer-${layer}`,
        target: nodeId,
        type: 'smoothstep',
        style: { stroke: colors.border, strokeWidth: 1.5 },
        animated: false,
      })

      xOffset += 150
    }

    yOffset += 150
  }

  // 레이어 간 연결
  for (let i = 0; i < layerOrder.length - 1; i++) {
    const from = layerOrder[i]
    const to = layerOrder[i + 1]

    if (byLayer[from].length > 0 && byLayer[to].length > 0) {
      edges.push({
        id: `e-${from}-${to}`,
        source: `layer-${from}`,
        target: `layer-${to}`,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        animated: true,
        label: getLayerConnectionLabel(from, to),
      })
    }
  }

  return { initialNodes: nodes, initialEdges: edges }
}

// ============================================================
// 흐름 뷰 생성
// ============================================================

function generateFlowView(callGraph: CallGraphResult): {
  initialNodes: Node[]
  initialEdges: Edge[]
} {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 핫스팟 함수 (상위 15개)
  const hotFunctions = callGraph.nodes
    .filter((n) => n.calledByCount > 0 || n.callCount > 0)
    .sort((a, b) => b.calledByCount + b.callCount - (a.calledByCount + a.callCount))
    .slice(0, 15)

  const nodeIds = new Set(hotFunctions.map((n) => n.id))

  // 노드 배치 (간단한 그리드)
  const columns = 4
  let xOffset = 100
  let yOffset = 100

  for (let i = 0; i < hotFunctions.length; i++) {
    const func = hotFunctions[i]
    const layer = inferLayerFromPath(func.file)
    const colors = LAYER_COLORS[layer] || LAYER_COLORS.unknown

    nodes.push({
      id: func.id,
      type: 'function',
      position: { x: xOffset, y: yOffset },
      data: {
        label: func.name,
        layer,
        type: func.type,
        functionCount: func.calledByCount,
        isHotspot: callGraph.hotspots.some((h) => h.functionId === func.id),
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        border: `2px solid ${colors.border}`,
        background: colors.bg,
      },
    })

    xOffset += 200
    if ((i + 1) % columns === 0) {
      xOffset = 100
      yOffset += 120
    }
  }

  // 함수 호출 엣지
  for (const edge of callGraph.edges) {
    if (!nodeIds.has(edge.fromId) || !nodeIds.has(edge.toId)) continue

    edges.push({
      id: `e-${edge.fromId}-${edge.toId}`,
      source: edge.fromId,
      target: edge.toId,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        stroke: edge.isAsync ? '#8b5cf6' : '#64748b',
        strokeWidth: 1.5,
        strokeDasharray: edge.isConditional ? '5,5' : undefined,
      },
      animated: edge.isAsync,
    })
  }

  // API 호출 노드
  if (callGraph.apiCalls.length > 0) {
    const uniquePaths = [...new Set(callGraph.apiCalls.map((a) => a.path))].slice(0, 3)

    for (let i = 0; i < uniquePaths.length; i++) {
      const path = uniquePaths[i]
      const nodeId = `api-${path.replace(/[^a-zA-Z0-9]/g, '_')}`

      nodes.push({
        id: nodeId,
        type: 'api',
        position: { x: 800, y: 100 + i * 100 },
        data: {
          path,
          method: callGraph.apiCalls.find((a) => a.path === path)?.method || 'GET',
        },
      })

      // API 호출 연결
      for (const api of callGraph.apiCalls.filter((a) => a.path === path)) {
        if (nodeIds.has(api.calledFrom)) {
          edges.push({
            id: `e-${api.calledFrom}-${nodeId}`,
            source: api.calledFrom,
            target: nodeId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#3b82f6', strokeWidth: 1.5 },
            animated: true,
            label: api.method,
          })
        }
      }
    }
  }

  // DB 호출 노드
  if (callGraph.dbCalls.length > 0) {
    const uniqueTables = [...new Set(callGraph.dbCalls.map((d) => d.table || 'supabase'))].slice(0, 3)

    for (let i = 0; i < uniqueTables.length; i++) {
      const table = uniqueTables[i]
      const nodeId = `db-${table.replace(/[^a-zA-Z0-9]/g, '_')}`

      nodes.push({
        id: nodeId,
        type: 'db',
        position: { x: 800, y: 400 + i * 100 },
        data: {
          table,
          operations: callGraph.dbCalls
            .filter((d) => (d.table || 'supabase') === table)
            .map((d) => d.type),
        },
      })

      // DB 호출 연결
      for (const db of callGraph.dbCalls.filter((d) => (d.table || 'supabase') === table)) {
        if (nodeIds.has(db.calledFrom)) {
          edges.push({
            id: `e-${db.calledFrom}-${nodeId}`,
            source: db.calledFrom,
            target: nodeId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#f59e0b', strokeWidth: 1.5 },
            animated: true,
            label: db.type,
          })
        }
      }
    }
  }

  return { initialNodes: nodes, initialEdges: edges }
}

// ============================================================
// 인과관계 뷰 생성 (Issue #60)
// ============================================================

function generateCausalityView(causalityData: CausalityData[]): {
  initialNodes: Node[]
  initialEdges: Edge[]
} {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 레이어별 그룹화
  const byLayer: Record<string, CausalityData[]> = {
    ui: [],
    logic: [],
    api: [],
    server: [],
    data: [],
    lib: [],
  }

  for (const item of causalityData) {
    const layer = item.layer || 'logic'
    if (!byLayer[layer]) byLayer[layer] = []
    byLayer[layer].push(item)
  }

  // 레이어 순서 (인과관계 흐름 방향)
  const layerOrder = ['ui', 'logic', 'api', 'server', 'data']
  let yOffset = 50

  // 레이어별 노드 배치
  for (const layer of layerOrder) {
    const items = byLayer[layer]
    if (!items || items.length === 0) continue

    const colors = LAYER_COLORS[layer] || LAYER_COLORS.unknown
    let xOffset = 100

    // 레이어 그룹 노드 (기본 노드 타입으로 변경)
    nodes.push({
      id: `layer-${layer}`,
      type: 'default',
      position: { x: 20, y: yOffset },
      data: {
        label: `${getLayerLabel(layer)} (${items.length})`,
      },
      style: {
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 8,
        padding: 10,
        fontWeight: 600,
        color: colors.text,
        minWidth: 120,
      },
    })

    // 모듈 노드들 (기본 노드 타입으로 변경)
    for (const item of items.slice(0, 4)) {
      const nodeId = `node-${item.path.replace(/[^a-zA-Z0-9]/g, '_')}`

      nodes.push({
        id: nodeId,
        type: 'default',
        position: { x: xOffset + 200, y: yOffset },
        data: {
          label: item.displayName || item.fileName,
        },
        style: {
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: 8,
          padding: 10,
          color: colors.text,
          fontSize: 12,
          minWidth: 100,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      // 레이어 → 모듈 연결
      edges.push({
        id: `e-layer-${layer}-${nodeId}`,
        source: `layer-${layer}`,
        target: nodeId,
        type: 'smoothstep',
        style: { stroke: colors.border, strokeWidth: 1.5, strokeDasharray: '4 2' },
        animated: false,
      })

      xOffset += 220
    }

    yOffset += 180
  }

  // 레이어 간 인과관계 연결 (트리거 → 효과 기반)
  const layerPairs = [
    { from: 'ui', to: 'logic', label: '사용자 이벤트', color: '#3b82f6' },
    { from: 'logic', to: 'api', label: 'API 요청', color: '#22c55e' },
    { from: 'logic', to: 'server', label: 'API 요청', color: '#22c55e' },
    { from: 'api', to: 'data', label: '데이터 저장', color: '#f59e0b' },
    { from: 'server', to: 'data', label: '데이터 저장', color: '#f59e0b' },
  ]

  for (const pair of layerPairs) {
    const fromItems = byLayer[pair.from] || []
    const toItems = byLayer[pair.to] || []

    if (fromItems.length > 0 && toItems.length > 0) {
      edges.push({
        id: `e-causality-${pair.from}-${pair.to}`,
        source: `layer-${pair.from}`,
        target: `layer-${pair.to}`,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: pair.color },
        style: { stroke: pair.color, strokeWidth: 3 },
        animated: true,
        label: pair.label,
        labelStyle: { fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
      })
    }
  }

  // 모듈 간 인과관계 연결 (relatedModules 기반)
  for (const item of causalityData) {
    if (!item.relatedModules || item.relatedModules.length === 0) continue

    const sourceId = `node-${item.path.replace(/[^a-zA-Z0-9]/g, '_')}`

    for (const related of item.relatedModules.slice(0, 2)) {
      // 관련 모듈 찾기
      const target = causalityData.find((d) =>
        d.fileName.toLowerCase().includes(related.toLowerCase()) ||
        d.displayName?.toLowerCase().includes(related.toLowerCase())
      )

      if (target) {
        const targetId = `node-${target.path.replace(/[^a-zA-Z0-9]/g, '_')}`

        edges.push({
          id: `e-related-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.Arrow },
          style: { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '5 3' },
          animated: false,
          label: '연관',
          labelStyle: { fontSize: 9 },
        })
      }
    }
  }

  return { initialNodes: nodes, initialEdges: edges }
}

// ============================================================
// 유틸리티
// ============================================================

function getLayerLabel(layer: string): string {
  const labels: Record<string, string> = {
    ui: '화면 (UI)',
    logic: '처리 (Logic)',
    api: '서버 (API)',
    data: '데이터 (Data)',
    lib: '유틸 (Lib)',
    unknown: '기타',
  }
  return labels[layer] || layer
}

function getLayerConnectionLabel(from: string, to: string): string {
  if (from === 'ui' && to === 'logic') return '이벤트'
  if (from === 'logic' && to === 'api') return 'API 호출'
  if (from === 'api' && to === 'data') return 'DB 접근'
  return ''
}

function inferLayerFromPath(path: string): string {
  const lowerPath = path.toLowerCase()

  if (lowerPath.includes('/api/') && lowerPath.includes('route.')) return 'api'
  if (lowerPath.includes('/components/') || lowerPath.includes('/pages/')) return 'ui'
  if (lowerPath.includes('/hooks/') || lowerPath.includes('/services/')) return 'logic'
  if (lowerPath.includes('/lib/') || lowerPath.includes('/utils/')) return 'lib'

  return 'unknown'
}

export default ReactFlowDiagram
