'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidDiagramProps {
  chart: string
  id?: string
}

// Mermaid 초기화 (한 번만)
let initialized = false

export default function MermaidDiagram({ chart, id = 'mermaid-diagram' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Mermaid 초기화
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        }
      })
      initialized = true
    }

    const renderDiagram = async () => {
      if (!containerRef.current) return

      try {
        // 고유 ID 생성
        const uniqueId = `${id}-${Date.now()}`

        // Mermaid 렌더링
        const { svg: renderedSvg } = await mermaid.render(uniqueId, chart)
        setSvg(renderedSvg)
        setError(null)
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError('다이어그램 렌더링 실패')
      }
    }

    renderDiagram()
  }, [chart, id])

  if (error) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#991b1b' }}>
        {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      data-testid="mermaid-container"
      style={{
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '20px',
        minHeight: '200px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
