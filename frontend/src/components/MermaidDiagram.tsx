'use client'

/**
 * MermaidDiagram - 향상된 Mermaid 다이어그램 컴포넌트
 * PRD v6.3 Issue #6: Mermaid 다이어그램 시각화 품질 개선
 *
 * Features:
 * - 레이어별 색상 구분
 * - 순환 의존성 강조 (빨간 점선)
 * - 줌/팬 인터랙션
 * - 노드 클릭 이벤트
 * - 툴팁 지원
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import mermaid from 'mermaid'

// 레이어별 색상 테마
export const LAYER_COLORS = {
  ui: { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' },
  logic: { fill: '#dcfce7', stroke: '#22c55e', text: '#166534' },
  server: { fill: '#ffedd5', stroke: '#f97316', text: '#9a3412' },
  api: { fill: '#ffedd5', stroke: '#f97316', text: '#9a3412' },
  data: { fill: '#e0e7ff', stroke: '#6366f1', text: '#3730a3' },
  lib: { fill: '#f3f4f6', stroke: '#6b7280', text: '#374151' },
  other: { fill: '#f5f5f5', stroke: '#a3a3a3', text: '#525252' },
}

interface MermaidDiagramProps {
  chart: string
  id?: string
  onNodeClick?: (nodeId: string) => void
  enableZoom?: boolean
  showLegend?: boolean
  circularNodes?: string[]
}

// Mermaid 초기화 (한 번만)
let initialized = false

export default function MermaidDiagram({
  chart,
  id = 'mermaid-diagram',
  onNodeClick,
  enableZoom = true,
  showLegend = true,
  circularNodes = [],
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // 레이어별 스타일이 적용된 Mermaid 코드 생성
  const enhancedChart = useCallback(() => {
    let enhanced = chart

    // 레이어별 classDef 추가
    const styleLines = [
      `classDef ui fill:${LAYER_COLORS.ui.fill},stroke:${LAYER_COLORS.ui.stroke},color:${LAYER_COLORS.ui.text}`,
      `classDef logic fill:${LAYER_COLORS.logic.fill},stroke:${LAYER_COLORS.logic.stroke},color:${LAYER_COLORS.logic.text}`,
      `classDef server fill:${LAYER_COLORS.server.fill},stroke:${LAYER_COLORS.server.stroke},color:${LAYER_COLORS.server.text}`,
      `classDef api fill:${LAYER_COLORS.api.fill},stroke:${LAYER_COLORS.api.stroke},color:${LAYER_COLORS.api.text}`,
      `classDef data fill:${LAYER_COLORS.data.fill},stroke:${LAYER_COLORS.data.stroke},color:${LAYER_COLORS.data.text}`,
      `classDef lib fill:${LAYER_COLORS.lib.fill},stroke:${LAYER_COLORS.lib.stroke},color:${LAYER_COLORS.lib.text}`,
      `classDef circular fill:#fef2f2,stroke:#dc2626,stroke-width:3px,color:#991b1b`,
      `classDef hasIssue fill:#fef2f2,stroke:#dc2626,stroke-dasharray:5 5`,
    ]

    // 스타일이 이미 있는지 확인하고 없으면 추가
    if (!enhanced.includes('classDef ui')) {
      enhanced = enhanced + '\n  ' + styleLines.join('\n  ')
    }

    return enhanced
  }, [chart])

  useEffect(() => {
    // Mermaid 초기화
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis',
          padding: 20,
          nodeSpacing: 50,
          rankSpacing: 50,
        },
        themeVariables: {
          primaryColor: LAYER_COLORS.ui.fill,
          primaryBorderColor: LAYER_COLORS.ui.stroke,
          primaryTextColor: LAYER_COLORS.ui.text,
          lineColor: '#94a3b8',
          fontSize: '14px',
        },
      })
      initialized = true
    }

    const renderDiagram = async () => {
      if (!containerRef.current) return

      try {
        // 고유 ID 생성
        const uniqueId = `${id}-${Date.now()}`

        // 향상된 Mermaid 렌더링
        const { svg: renderedSvg } = await mermaid.render(uniqueId, enhancedChart())
        setSvg(renderedSvg)
        setError(null)

        // 렌더링 후 클릭 이벤트 바인딩
        setTimeout(() => {
          if (svgContainerRef.current && onNodeClick) {
            const nodes = svgContainerRef.current.querySelectorAll('.node')
            nodes.forEach((node) => {
              node.addEventListener('click', () => {
                const nodeId = node.id || node.getAttribute('data-id') || ''
                onNodeClick(nodeId)
              })
              // 클릭 가능 스타일
              ;(node as HTMLElement).style.cursor = 'pointer'
            })
          }
        }, 100)
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError('다이어그램 렌더링 실패')
      }
    }

    renderDiagram()
  }, [chart, id, enhancedChart, onNodeClick])

  // 줌 핸들러
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!enableZoom) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 3))
    },
    [enableZoom]
  )

  // 팬 핸들러
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enableZoom) return
      if (e.button === 0) {
        setIsDragging(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      }
    },
    [enableZoom, pan]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && enableZoom) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
      }
    },
    [isDragging, enableZoom, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 리셋
  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          color: '#991b1b',
        }}
      >
        {error}
        <pre style={{ fontSize: '12px', marginTop: '8px', overflow: 'auto' }}>
          {chart.slice(0, 200)}...
        </pre>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* 컨트롤 버튼 */}
      {enableZoom && (
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
            onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="확대"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="축소"
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
            title="리셋"
          >
            리셋
          </button>
        </div>
      )}

      {/* 줌 레벨 표시 */}
      {enableZoom && (
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
            zIndex: 10,
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* 메인 다이어그램 영역 */}
      <div
        ref={containerRef}
        data-testid="mermaid-container"
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          padding: '20px',
          minHeight: '300px',
          overflow: 'hidden',
          cursor: enableZoom ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={svgContainerRef}
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* 범례 */}
      {showLegend && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              marginBottom: '8px',
            }}
          >
            범례
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <LegendItem color={LAYER_COLORS.ui} label="화면 (UI)" />
            <LegendItem color={LAYER_COLORS.logic} label="처리 (Logic)" />
            <LegendItem color={LAYER_COLORS.server} label="서버 (API)" />
            <LegendItem color={LAYER_COLORS.data} label="저장 (Data)" />
            <LegendItem color={LAYER_COLORS.lib} label="유틸 (Lib)" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  background: '#fef2f2',
                  border: '2px dashed #dc2626',
                  borderRadius: '4px',
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>이슈 있음</span>
            </div>
            {circularNodes.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    background: '#fef2f2',
                    border: '3px solid #dc2626',
                    borderRadius: '4px',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>
                  순환 의존성
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 범례 아이템 컴포넌트
function LegendItem({
  color,
  label,
}: {
  color: { fill: string; stroke: string }
  label: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          width: '16px',
          height: '16px',
          background: color.fill,
          border: `2px solid ${color.stroke}`,
          borderRadius: '4px',
        }}
      />
      <span style={{ fontSize: '12px', color: '#64748b' }}>{label}</span>
    </div>
  )
}

/**
 * Mermaid 코드에 레이어 스타일 자동 적용
 * 이 함수는 API에서 생성된 기본 mermaid 코드에
 * 레이어별 색상 스타일을 추가합니다.
 */
export function applyLayerStyles(mermaidCode: string): string {
  const styleLines = [
    `  classDef ui fill:${LAYER_COLORS.ui.fill},stroke:${LAYER_COLORS.ui.stroke},color:${LAYER_COLORS.ui.text}`,
    `  classDef logic fill:${LAYER_COLORS.logic.fill},stroke:${LAYER_COLORS.logic.stroke},color:${LAYER_COLORS.logic.text}`,
    `  classDef server fill:${LAYER_COLORS.server.fill},stroke:${LAYER_COLORS.server.stroke},color:${LAYER_COLORS.server.text}`,
    `  classDef api fill:${LAYER_COLORS.api.fill},stroke:${LAYER_COLORS.api.stroke},color:${LAYER_COLORS.api.text}`,
    `  classDef data fill:${LAYER_COLORS.data.fill},stroke:${LAYER_COLORS.data.stroke},color:${LAYER_COLORS.data.text}`,
    `  classDef lib fill:${LAYER_COLORS.lib.fill},stroke:${LAYER_COLORS.lib.stroke},color:${LAYER_COLORS.lib.text}`,
    `  classDef circular fill:#fef2f2,stroke:#dc2626,stroke-width:3px,color:#991b1b`,
    `  classDef hasIssue fill:#fef2f2,stroke:#dc2626,stroke-dasharray:5 5`,
  ]

  // 이미 스타일이 있으면 기존 코드 반환
  if (mermaidCode.includes('classDef ui')) {
    return mermaidCode
  }

  // 레이어 서브그래프에 클래스 적용
  let enhanced = mermaidCode
  enhanced = enhanced + '\n' + styleLines.join('\n')

  // 각 레이어 서브그래프에 클래스 적용
  const layers = ['ui', 'logic', 'server', 'api', 'data', 'lib']
  for (const layer of layers) {
    // subgraph 내의 노드들에 클래스 적용
    const subgraphRegex = new RegExp(`subgraph ${layer}\\[`, 'g')
    if (subgraphRegex.test(mermaidCode)) {
      enhanced = enhanced + `\n  class ${layer} ${layer}`
    }
  }

  return enhanced
}
