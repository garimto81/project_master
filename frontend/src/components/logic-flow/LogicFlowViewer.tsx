'use client'

/**
 * LogicFlowViewer - 다층 코드 시각화 컴포넌트
 * PRD v6.2 Section 1.2: 다층 시각화 시스템
 *
 * 프로젝트 → 모듈 → 함수 드릴다운 지원
 */

import { useState, useEffect, useCallback } from 'react'
import MermaidDiagram from '../MermaidDiagram'

export type ViewLevel = 'project' | 'module' | 'function'

interface Module {
  name: string
  path: string
  status: 'normal' | 'error' | 'warning'
  issue_count: number
  function_count: number
}

interface FunctionInfo {
  name: string
  type: 'function' | 'class' | 'component'
  calls: string[]
  status: 'normal' | 'error'
  line_start: number
  line_end: number
}

interface LogicFlowViewerProps {
  repo: string
  initialLevel?: ViewLevel
  initialModule?: string
  onNodeClick?: (node: { name: string; level: ViewLevel; path?: string }) => void
  showLegend?: boolean
}

export default function LogicFlowViewer({
  repo,
  initialLevel = 'project',
  initialModule,
  onNodeClick,
  showLegend = true,
}: LogicFlowViewerProps) {
  const [level, setLevel] = useState<ViewLevel>(initialLevel)
  const [currentModule, setCurrentModule] = useState<string | null>(initialModule || null)
  const [mermaidCode, setMermaidCode] = useState<string>('')
  const [modules, setModules] = useState<Module[]>([])
  const [functions, setFunctions] = useState<FunctionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<string[]>([repo])

  // 프로젝트 개요 로드
  const loadProjectOverview = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/logic-flow/overview?repo=${encodeURIComponent(repo)}`)
      if (!response.ok) throw new Error('Failed to load project overview')

      const data = await response.json()
      setModules(data.modules || [])
      setMermaidCode(data.mermaid_code || '')
      setBreadcrumb([repo])
    } catch (err) {
      console.error('Load overview error:', err)
      setError('프로젝트 구조를 불러올 수 없습니다')
      // 폴백 데이터
      setMermaidCode(`block-beta
  columns 4
  auth["auth"]
  api["api"]
  components["components"]
  lib["lib"]`)
    } finally {
      setLoading(false)
    }
  }, [repo])

  // 모듈 상세 로드
  const loadModuleDetail = useCallback(async (moduleName: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/logic-flow/module?repo=${encodeURIComponent(repo)}&module=${encodeURIComponent(moduleName)}`
      )
      if (!response.ok) throw new Error('Failed to load module detail')

      const data = await response.json()
      setFunctions(data.functions || [])
      setMermaidCode(data.mermaid_code || '')
      setCurrentModule(moduleName)
      setBreadcrumb([repo, moduleName])
    } catch (err) {
      console.error('Load module error:', err)
      setError('모듈 정보를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [repo])

  // 초기 로드
  useEffect(() => {
    if (level === 'project') {
      loadProjectOverview()
    } else if (level === 'module' && initialModule) {
      loadModuleDetail(initialModule)
    }
  }, [level, initialModule, loadProjectOverview, loadModuleDetail])

  // 뒤로가기
  const handleBack = () => {
    if (level === 'module') {
      setLevel('project')
      setCurrentModule(null)
      loadProjectOverview()
    } else if (level === 'function') {
      setLevel('module')
      if (currentModule) loadModuleDetail(currentModule)
    }
  }

  // 노드 클릭 (드릴다운)
  const handleDrillDown = (name: string) => {
    if (level === 'project') {
      setLevel('module')
      loadModuleDetail(name)
      onNodeClick?.({ name, level: 'module', path: `src/${name}/` })
    } else if (level === 'module') {
      // 함수 레벨로 이동 (향후 구현)
      onNodeClick?.({ name, level: 'function' })
    }
  }

  return (
    <div data-testid="logic-flow-viewer" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 헤더: 네비게이션 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: '#f8fafc',
        borderRadius: '8px',
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {level !== 'project' && (
            <button
              onClick={handleBack}
              data-testid="back-button"
              style={{
                padding: '4px 8px',
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ← 뒤로
            </button>
          )}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
            {breadcrumb.map((item, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: '#94a3b8' }}> / </span>}
                <span style={{ color: i === breadcrumb.length - 1 ? '#1e293b' : '#64748b' }}>
                  {item}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* 레벨 표시 */}
        <span style={{
          padding: '4px 12px',
          background: level === 'project' ? '#dbeafe' : level === 'module' ? '#dcfce7' : '#fef3c7',
          color: level === 'project' ? '#1d4ed8' : level === 'module' ? '#166534' : '#92400e',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 500,
        }}>
          {level === 'project' ? '📊 프로젝트 개요' : level === 'module' ? '📦 모듈 상세' : '⚙️ 함수 흐름'}
        </span>
      </div>

      {/* 로딩/에러 상태 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          로딩 중...
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px',
          background: '#fef2f2',
          borderRadius: '8px',
          color: '#991b1b',
        }}>
          {error}
        </div>
      )}

      {/* 다이어그램 */}
      {!loading && !error && (
        <div style={{ position: 'relative' }}>
          <MermaidDiagram chart={mermaidCode} id={`logic-flow-${level}`} />

          {/* 클릭 가능한 오버레이 (프로젝트/모듈 레벨) */}
          {(level === 'project' || level === 'module') && (
            <div
              data-testid="clickable-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                // SVG 노드 클릭 감지
                const target = e.target as HTMLElement
                const nodeText = target.textContent?.trim()
                if (nodeText && level === 'project') {
                  const module = modules.find(m => nodeText.includes(m.name))
                  if (module) handleDrillDown(module.name)
                }
              }}
            />
          )}
        </div>
      )}

      {/* 모듈/함수 목록 (클릭 가능) */}
      {!loading && !error && level === 'project' && modules.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '12px',
          marginTop: '16px',
        }}>
          {modules.map((mod) => (
            <button
              key={mod.name}
              onClick={() => handleDrillDown(mod.name)}
              data-testid={`module-card-${mod.name}`}
              style={{
                padding: '12px',
                background: mod.status === 'error' ? '#fef2f2' : '#fff',
                border: `1px solid ${mod.status === 'error' ? '#fecaca' : '#e2e8f0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontWeight: 500, color: '#1e293b' }}>
                {mod.status === 'error' ? '🔴 ' : '📦 '}{mod.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {mod.function_count}개 함수
                {mod.issue_count > 0 && ` · ${mod.issue_count}개 이슈`}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 함수 목록 (모듈 레벨) */}
      {!loading && !error && level === 'module' && functions.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '16px',
        }}>
          {functions.map((func, i) => (
            <div
              key={i}
              data-testid={`function-item-${i}`}
              style={{
                padding: '12px 16px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ marginRight: '8px' }}>
                  {func.type === 'class' ? '📦' : func.type === 'component' ? '🧩' : '⚙️'}
                </span>
                <span style={{ fontWeight: 500 }}>{func.name}</span>
                {func.calls.length > 0 && (
                  <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>
                    → {func.calls.join(', ')}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                L{func.line_start}-{func.line_end}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 범례 */}
      {showLegend && !loading && (
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#64748b',
        }}>
          <span>📦 모듈</span>
          <span>⚙️ 함수</span>
          <span>🧩 컴포넌트</span>
          <span>🔴 에러</span>
        </div>
      )}
    </div>
  )
}
