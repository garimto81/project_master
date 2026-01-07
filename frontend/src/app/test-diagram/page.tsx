'use client'

/**
 * 다이어그램 테스트 페이지 - 목데이터로 확인
 */

import dynamic from 'next/dynamic'
import ReactFlow, { Background, Controls, ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'

const InteractiveFlowDiagram = dynamic(
  () => import('@/components/InteractiveFlowDiagram'),
  { ssr: false }
)

const ReactFlowDiagram = dynamic(
  () => import('@/components/visualization/ReactFlowDiagram'),
  { ssr: false }
)

// 기본 React Flow 테스트용 노드
const basicNodes = [
  { id: '1', position: { x: 100, y: 50 }, data: { label: 'UI (화면)' }, style: { background: '#dbeafe', border: '2px solid #3b82f6', borderRadius: 8, padding: 10 } },
  { id: '2', position: { x: 100, y: 150 }, data: { label: 'Logic (처리)' }, style: { background: '#dcfce7', border: '2px solid #22c55e', borderRadius: 8, padding: 10 } },
  { id: '3', position: { x: 100, y: 250 }, data: { label: 'API (서버)' }, style: { background: '#ffedd5', border: '2px solid #f97316', borderRadius: 8, padding: 10 } },
  { id: '4', position: { x: 100, y: 350 }, data: { label: 'Data (저장)' }, style: { background: '#e0e7ff', border: '2px solid #6366f1', borderRadius: 8, padding: 10 } },
]

const basicEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, label: '이벤트' },
  { id: 'e2-3', source: '2', target: '3', animated: true, label: 'API 호출' },
  { id: 'e3-4', source: '3', target: '4', animated: true, label: '저장' },
]

// 기본 React Flow 테스트 컴포넌트
function BasicReactFlowTest() {
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={basicNodes}
        edges={basicEdges}
        fitView
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls />
      </ReactFlow>
    </ReactFlowProvider>
  )
}

// 목데이터
const mockLayers = [
  {
    name: 'ui',
    displayName: 'UI (화면)',
    modules: ['LoginPage', 'Dashboard', 'ProjectView', 'SettingsPage'],
    description: '사용자 인터페이스 컴포넌트',
  },
  {
    name: 'logic',
    displayName: 'Logic (처리)',
    modules: ['useAuth', 'useProjects', 'useAnalysis', 'formValidation'],
    description: '비즈니스 로직 및 상태 관리',
  },
  {
    name: 'server',
    displayName: 'API (서버)',
    modules: ['auth/route', 'projects/route', 'analysis/route', 'health/route'],
    description: 'API 엔드포인트',
  },
  {
    name: 'data',
    displayName: 'Data (저장)',
    modules: ['supabase', 'localStorage', 'sessionStorage'],
    description: '데이터 저장소',
  },
]

const mockConnections = [
  { from: 'ui', to: 'logic', type: 'call' as const, label: '이벤트 전달' },
  { from: 'logic', to: 'server', type: 'fetch' as const, label: 'API 호출' },
  { from: 'server', to: 'data', type: 'call' as const, label: '데이터 저장' },
]

const mockRiskPoints = [
  { location: 'LoginPage', function: 'handleSubmit', risk: 'high' as const, reason: 'try-catch 없음' },
  { location: 'useAuth', function: 'refreshToken', risk: 'medium' as const, reason: '에러 처리 미흡' },
]

const mockIssues = [
  { number: 1, title: '로그인 에러 처리 개선', related_layer: 'ui' },
  { number: 2, title: 'API 응답 캐싱 추가', related_layer: 'server' },
]

// 인과관계 뷰용 목데이터
const mockCausalityData = [
  {
    path: 'src/app/page.tsx',
    fileName: 'page.tsx',
    displayName: '🔐 로그인',
    description: 'GitHub OAuth로 사용자 인증',
    layer: 'ui',
    triggers: ['버튼 클릭', '페이지 로드 시 자동 리다이렉트'],
    effects: ['세션 저장', '대시보드로 이동'],
    dataFlow: ['GitHub Token → Supabase Session'],
    inputs: ['GitHub 인증 코드'],
    outputs: ['로그인 상태', '사용자 정보'],
    relatedModules: ['useAuth', 'supabase'],
  },
  {
    path: 'src/lib/hooks/useAuth.ts',
    fileName: 'useAuth.ts',
    displayName: '⚙️ 인증 처리',
    description: '로그인/로그아웃 로직',
    layer: 'logic',
    triggers: ['로그인 버튼 클릭', '토큰 만료'],
    effects: ['세션 갱신', '리다이렉트'],
    dataFlow: ['Session → User State'],
    inputs: ['OAuth Token'],
    outputs: ['User Session', 'Auth State'],
    relatedModules: ['supabase', 'page'],
  },
  {
    path: 'src/app/api/auth/me/route.ts',
    fileName: 'route.ts',
    displayName: '🌐 사용자 조회',
    description: '현재 로그인된 사용자 정보 API',
    layer: 'api',
    triggers: ['페이지 로드', 'SWR 리프레시'],
    effects: ['사용자 정보 반환'],
    dataFlow: ['Cookie → Session → User Info'],
    inputs: ['Session Cookie'],
    outputs: ['User Object'],
    relatedModules: ['useAuth'],
  },
  {
    path: 'src/lib/supabase.ts',
    fileName: 'supabase.ts',
    displayName: '💾 데이터베이스',
    description: 'Supabase 클라이언트 및 세션 관리',
    layer: 'data',
    triggers: ['인증 요청', '데이터 쿼리'],
    effects: ['세션 저장', '데이터 반환'],
    dataFlow: ['Auth Token → PostgreSQL'],
    inputs: ['Auth Token', 'Query'],
    outputs: ['Session', 'Data'],
    relatedModules: ['useAuth', 'route'],
  },
]

export default function TestDiagramPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: '1.5rem', color: '#1e293b' }}>
        다이어그램 테스트 (목데이터)
      </h1>

      {/* 테스트 1: InteractiveFlowDiagram */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b' }}>
          1. InteractiveFlowDiagram (레이어 기반)
        </h2>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px' }}>
          <InteractiveFlowDiagram
            layers={mockLayers}
            connections={mockConnections}
            riskPoints={mockRiskPoints}
            issues={mockIssues}
            onLayerClick={(layer) => alert(`Layer clicked: ${layer.displayName}`)}
            onModuleClick={(mod, layer) => alert(`Module clicked: ${mod} in ${layer.displayName}`)}
          />
        </div>
      </section>

      {/* 테스트 2: 기본 React Flow */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b' }}>
          2. 기본 React Flow 테스트
        </h2>
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', height: '500px' }}>
          <BasicReactFlowTest />
        </div>
      </section>

      {/* 테스트 3: ReactFlowDiagram - 인과관계 뷰 */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b' }}>
          3. ReactFlowDiagram - 인과관계 뷰 (CausalityNode)
        </h2>
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', height: '700px', position: 'relative' }}>
          <ReactFlowDiagram
            mode="causality"
            causalityData={mockCausalityData}
            onNodeClick={(id, data) => console.log('Node clicked:', id, data)}
          />
        </div>
      </section>

      {/* 범례 */}
      <section style={{ background: '#fff', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#1e293b' }}>
          범례
        </h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 20, height: 20, background: '#dbeafe', border: '2px solid #3b82f6', borderRadius: 4 }} />
            <span>UI (화면)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 20, height: 20, background: '#dcfce7', border: '2px solid #22c55e', borderRadius: 4 }} />
            <span>Logic (처리)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 20, height: 20, background: '#ffedd5', border: '2px solid #f97316', borderRadius: 4 }} />
            <span>API (서버)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 20, height: 20, background: '#e0e7ff', border: '2px solid #6366f1', borderRadius: 4 }} />
            <span>Data (저장)</span>
          </div>
        </div>
      </section>
    </main>
  )
}
