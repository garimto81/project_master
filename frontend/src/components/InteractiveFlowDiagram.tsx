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

// 이슈 #45: 레이어 간 기본 인과관계 라벨
const LAYER_FLOW_LABELS: Record<string, string> = {
  'ui→logic': '사용자 입력 전달',
  'logic→server': '처리된 요청 전송',
  'server→data': '응답 데이터 저장',
  'data→ui': '화면에 결과 표시',
  'ui→server': 'API 요청',
  'logic→data': '상태 업데이트',
}

// 이슈 #45: 모듈명 → 자연어 설명 변환 (비개발자 친화)
const MODULE_DESCRIPTIONS: Record<string, string> = {
  // 공통 패턴
  page: '화면 페이지',
  layout: '화면 레이아웃',
  header: '상단 메뉴',
  footer: '하단 정보',
  sidebar: '측면 메뉴',
  modal: '팝업 창',
  form: '입력 양식',
  button: '버튼',
  input: '입력 필드',
  card: '카드 컴포넌트',
  list: '목록 표시',
  table: '표 형식 데이터',
  // 기능별
  auth: '로그인/인증',
  login: '로그인 처리',
  logout: '로그아웃 처리',
  register: '회원가입',
  profile: '프로필 관리',
  settings: '설정',
  dashboard: '대시보드',
  home: '홈 화면',
  search: '검색 기능',
  filter: '필터링',
  sort: '정렬',
  // 데이터
  api: 'API 통신',
  fetch: '데이터 가져오기',
  store: '데이터 저장소',
  cache: '캐시 관리',
  utils: '유틸리티',
  helpers: '도우미 함수',
  hooks: '상태 관리',
  context: '전역 상태',
  // 시각화 관련
  diagram: '다이어그램',
  chart: '차트',
  graph: '그래프',
  visualization: '시각화',
  mermaid: '흐름도',
  flow: '데이터 흐름',
}

// 모듈명에서 자연어 설명 추출
function getModuleDescription(moduleName: string): string {
  const lowerName = moduleName.toLowerCase()

  // 정확히 매칭
  if (MODULE_DESCRIPTIONS[lowerName]) {
    return MODULE_DESCRIPTIONS[lowerName]
  }

  // 부분 매칭
  for (const [key, desc] of Object.entries(MODULE_DESCRIPTIONS)) {
    if (lowerName.includes(key)) {
      return desc
    }
  }

  // CamelCase 분리
  const words = moduleName.replace(/([A-Z])/g, ' $1').trim().split(' ')
  if (words.length > 1) {
    return words.join(' ')
  }

  return moduleName
}

// Phase 2: 사용자 여정 설명 (이슈 #41)
const LAYER_JOURNEY_DESC: Record<string, { action: string; example: string; result: string }> = {
  ui: {
    action: '사용자가 버튼을 클릭하거나 폼을 입력합니다',
    example: '예: "로그인 버튼 클릭", "검색어 입력"',
    result: '화면에서 받은 입력을 처리 레이어로 전달',
  },
  logic: {
    action: '입력 데이터를 검증하고 변환합니다',
    example: '예: "비밀번호 유효성 검사", "날짜 형식 변환"',
    result: '가공된 데이터를 서버로 전송 준비',
  },
  server: {
    action: '외부 서버에 데이터를 요청합니다',
    example: '예: "API 호출", "로그인 인증 요청"',
    result: '서버 응답을 받아 데이터 저장',
  },
  data: {
    action: '응답 데이터를 저장하고 관리합니다',
    example: '예: "사용자 정보 저장", "로그인 상태 업데이트"',
    result: '저장된 데이터가 화면에 표시됨',
  },
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

  // Phase 2: 가이드 모드 상태 (이슈 #41)
  const [guideMode, setGuideMode] = useState(false)
  const [guideStep, setGuideStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)

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

  // Phase 2: 가이드 자동 재생 (이슈 #41)
  useEffect(() => {
    if (!isAutoPlaying || !guideMode) return

    const timer = setInterval(() => {
      setGuideStep(prev => {
        if (prev >= layers.length) {
          setIsAutoPlaying(false)
          return 0
        }
        return prev + 1
      })
    }, 3000)

    return () => clearInterval(timer)
  }, [isAutoPlaying, guideMode, layers.length])

  // 가이드 모드 토글
  const toggleGuideMode = () => {
    setGuideMode(!guideMode)
    setGuideStep(0)
    setIsAutoPlaying(false)
  }

  // 가이드 단계 이동
  const nextGuideStep = () => {
    setGuideStep(prev => Math.min(prev + 1, layers.length))
  }

  const prevGuideStep = () => {
    setGuideStep(prev => Math.max(prev - 1, 0))
  }

  // 레이어 위치 계산 (향후 사용 예정)
  // const getLayerPosition = (index: number, total: number) => {
  //   const baseY = 80
  //   const spacing = 140
  //   return { x: 50, y: baseY + index * spacing }
  // }

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
        {/* Phase 2: 가이드 모드 버튼 (이슈 #41) */}
        <button
          onClick={toggleGuideMode}
          style={{
            padding: '0 12px',
            height: '32px',
            borderRadius: '6px',
            border: guideMode ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            background: guideMode ? '#dbeafe' : '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            color: guideMode ? '#1e40af' : '#64748b',
            fontWeight: guideMode ? 600 : 400,
          }}
        >
          {guideMode ? '🎯 가이드 ON' : '🎯 가이드'}
        </button>
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

      {/* Phase 2: 가이드 패널 (이슈 #41) */}
      {guideMode && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            right: '12px',
            width: '320px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 20,
            overflow: 'hidden',
          }}
        >
          {/* 가이드 헤더 */}
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: '#fff',
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
              🗺️ 사용자 여정 가이드
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
              데이터가 어떻게 흐르는지 단계별로 알아보세요
            </p>
          </div>

          {/* 진행 바 */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '8px',
            }}>
              {[0, ...layers.map((_, i) => i + 1)].map(step => (
                <div
                  key={step}
                  onClick={() => setGuideStep(step)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: step <= guideStep ? '#3b82f6' : '#e2e8f0',
                    cursor: 'pointer',
                    transition: 'background 0.3s',
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
              단계 {guideStep} / {layers.length}
            </div>
          </div>

          {/* 가이드 내용 */}
          <div style={{ padding: '16px', minHeight: '120px' }}>
            {guideStep === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>👤</div>
                <h4 style={{ margin: '0 0 8px', color: '#1e293b' }}>사용자 시작</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                  사용자가 앱을 열고 버튼을 클릭하거나 정보를 입력합니다.
                  이 입력은 화면(UI) 레이어에서 처리됩니다.
                </p>
              </div>
            ) : (
              (() => {
                const layer = layers[guideStep - 1]
                const journey = LAYER_JOURNEY_DESC[layer?.name] || LAYER_JOURNEY_DESC.logic
                const colors = LAYER_COLORS[layer?.name] || LAYER_COLORS.logic
                const icon = LAYER_ICONS[layer?.name] || '📦'

                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: colors.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}>
                        {icon}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, color: colors.text }}>{layer?.displayName}</h4>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                          {layer?.modules.length}개 모듈
                        </p>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                      <p style={{ margin: '0 0 8px', color: '#1e293b' }}>
                        <strong>무엇을 하나요?</strong><br />
                        {journey.action}
                      </p>
                      <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '12px' }}>
                        {journey.example}
                      </p>
                      <p style={{ margin: 0, color: '#3b82f6', fontWeight: 500 }}>
                        → {journey.result}
                      </p>
                    </div>
                  </div>
                )
              })()
            )}
          </div>

          {/* 가이드 컨트롤 */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <button
              onClick={prevGuideStep}
              disabled={guideStep === 0}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: guideStep === 0 ? '#f1f5f9' : '#e2e8f0',
                color: guideStep === 0 ? '#94a3b8' : '#64748b',
                cursor: guideStep === 0 ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              ← 이전
            </button>

            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: isAutoPlaying ? '#dbeafe' : '#3b82f6',
                color: isAutoPlaying ? '#1e40af' : '#fff',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {isAutoPlaying ? '⏸ 일시정지' : '▶ 자동재생'}
            </button>

            <button
              onClick={nextGuideStep}
              disabled={guideStep >= layers.length}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: guideStep >= layers.length ? '#f1f5f9' : '#3b82f6',
                color: guideStep >= layers.length ? '#94a3b8' : '#fff',
                cursor: guideStep >= layers.length ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              다음 →
            </button>
          </div>
        </div>
      )}

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
            // Phase 2: 가이드 모드에서 현재 단계 하이라이트 (이슈 #41)
            const isGuideHighlighted = guideMode && guideStep === index + 1

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
                    background: isGuideHighlighted ? colors.bg : (isHovered ? colors.bg : colors.light),
                    border: `2px solid ${isGuideHighlighted ? colors.border : (isHovered ? colors.border : '#e2e8f0')}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: isGuideHighlighted ? 'scale(1.03)' : (isHovered ? 'scale(1.02)' : 'scale(1)'),
                    boxShadow: isGuideHighlighted
                      ? `0 8px 24px ${colors.border}60, 0 0 0 4px ${colors.border}20`
                      : (isHovered ? `0 4px 12px ${colors.border}40` : 'none'),
                    // 가이드 모드에서 비활성 레이어 흐리게
                    opacity: guideMode && !isGuideHighlighted && guideStep > 0 ? 0.5 : 1,
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
                      {/* 이슈 #45: 모듈에 자연어 설명 추가 */}
                      {layer.modules.map((mod) => {
                        const description = getModuleDescription(mod)
                        const hasDescription = description !== mod

                        return (
                          <button
                            key={mod}
                            onClick={(e) => {
                              e.stopPropagation()
                              onModuleClick?.(mod, layer)
                            }}
                            title={hasDescription ? `${description} (${mod})` : mod}
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
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
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
                            {/* 자연어 설명 (있을 경우) */}
                            {hasDescription && (
                              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                                {description}
                              </span>
                            )}
                            {/* 원본 모듈명 */}
                            <span style={{
                              fontSize: hasDescription ? '10px' : '13px',
                              color: hasDescription ? '#94a3b8' : colors.text,
                              fontFamily: hasDescription ? 'monospace' : 'inherit',
                            }}>
                              {mod}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 화살표 (레이어 간) - 이슈 #45: 인과관계 라벨 개선 */}
                {index < layers.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: '20px', color: '#94a3b8' }}>↓</div>
                      {(() => {
                        // 명시적 connection 라벨 또는 기본 인과관계 라벨
                        const nextLayer = layers[index + 1]
                        const connection = connections.find(c => c.from === layer.name && c.to === nextLayer?.name)
                        const flowKey = `${layer.name}→${nextLayer?.name}`
                        const label = connection?.label || LAYER_FLOW_LABELS[flowKey] || ''

                        return label ? (
                          <div style={{
                            fontSize: '11px',
                            color: '#3b82f6',
                            marginTop: '-4px',
                            padding: '2px 8px',
                            background: '#eff6ff',
                            borderRadius: '10px',
                            fontWeight: 500,
                          }}>
                            {label}
                          </div>
                        ) : null
                      })()}
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
