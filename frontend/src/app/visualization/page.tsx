'use client'

/**
 * Visualization Page - 코드 로직 시각화
 * PRD v6.2 Section 1.2: 다층 시각화 시스템
 *
 * 프로젝트 → 모듈 → 함수 드릴다운 + 스텝바이스텝 실행
 */

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogicFlowViewer, StepPlayer } from '@/components/logic-flow'

type ViewMode = 'overview' | 'step-player'

function VisualizationContent() {
  const searchParams = useSearchParams()
  const repo = searchParams.get('repo') || 'garimto81/project_master'

  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null)

  return (
    <main
      data-testid="visualization-page"
      style={{
        minHeight: '100vh',
        background: '#f1f5f9',
      }}
    >
      {/* 헤더 */}
      <header
        data-testid="header"
        style={{
          background: '#fff',
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/"
            style={{
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            ← DevFlow
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
            📊 코드 시각화
          </h1>
        </div>

        {/* 뷰 모드 토글 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('overview')}
            data-testid="btn-overview"
            style={{
              padding: '8px 16px',
              background: viewMode === 'overview' ? '#3b82f6' : '#f1f5f9',
              color: viewMode === 'overview' ? '#fff' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            📦 구조 보기
          </button>
          <button
            onClick={() => setViewMode('step-player')}
            data-testid="btn-step-player"
            style={{
              padding: '8px 16px',
              background: viewMode === 'step-player' ? '#3b82f6' : '#f1f5f9',
              color: viewMode === 'step-player' ? '#fff' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ▶️ 실행 흐름
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* 레포지토리 정보 */}
        <div
          style={{
            padding: '16px',
            background: '#fff',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ color: '#64748b', fontSize: '14px' }}>레포지토리</span>
            <div style={{ fontSize: '18px', fontWeight: 500, color: '#1e293b' }}>
              {repo}
            </div>
          </div>
          <a
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              background: '#24292f',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            GitHub에서 보기 ↗
          </a>
        </div>

        {/* 뷰 모드별 컨텐츠 */}
        {viewMode === 'overview' ? (
          <div data-testid="overview-section">
            <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b' }}>
              프로젝트 구조
            </h2>
            <p style={{ margin: '0 0 24px', color: '#64748b' }}>
              모듈을 클릭하여 상세 정보를 확인하세요. 빨간색 모듈은 버그 이슈가 있는 모듈입니다.
            </p>
            <LogicFlowViewer
              repo={repo}
              onNodeClick={(node) => {
                if (node.level === 'function') {
                  setSelectedFunction(node.name)
                  setViewMode('step-player')
                }
              }}
            />
          </div>
        ) : (
          <div data-testid="step-player-section">
            <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b' }}>
              실행 흐름 시뮬레이션
            </h2>
            <p style={{ margin: '0 0 24px', color: '#64748b' }}>
              코드가 어떤 순서로 실행되는지 애니메이션으로 확인하세요.
            </p>

            {/* 함수 선택 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                분석할 함수 선택:
              </label>
              <select
                value={selectedFunction || ''}
                onChange={(e) => setSelectedFunction(e.target.value)}
                data-testid="function-select"
                style={{
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  minWidth: '300px',
                }}
              >
                <option value="">함수를 선택하세요</option>
                <option value="handleLogin">handleLogin (로그인 처리)</option>
                <option value="fetchData">fetchData (데이터 가져오기)</option>
                <option value="validateInput">validateInput (입력 검증)</option>
                <option value="processRequest">processRequest (요청 처리)</option>
              </select>
            </div>

            {selectedFunction ? (
              <StepPlayer
                repo={repo}
                functionName={selectedFunction}
                onStepChange={(step, index) => {
                  console.log('Step changed:', step, index)
                }}
              />
            ) : (
              <div
                style={{
                  padding: '60px',
                  background: '#fff',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <p>분석할 함수를 선택하면 실행 흐름을 볼 수 있습니다</p>
              </div>
            )}
          </div>
        )}

        {/* 도움말 */}
        <div
          style={{
            marginTop: '32px',
            padding: '20px',
            background: '#eff6ff',
            borderRadius: '12px',
            border: '1px solid #bfdbfe',
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1d4ed8' }}>
            💡 시각화 사용법
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', lineHeight: '1.8' }}>
            <li><strong>구조 보기</strong>: 프로젝트 전체 모듈 구조를 확인합니다. 모듈을 클릭하면 함수 목록이 표시됩니다.</li>
            <li><strong>실행 흐름</strong>: 특정 함수의 실행 순서를 단계별로 애니메이션으로 확인합니다.</li>
            <li><strong>드릴다운</strong>: 프로젝트 → 모듈 → 함수 순으로 상세 정보를 탐색할 수 있습니다.</li>
            <li><strong>에러 표시</strong>: 버그 이슈가 있는 모듈은 빨간색으로 표시됩니다.</li>
          </ul>
        </div>
      </div>
    </main>
  )
}

export default function VisualizationPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
      }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <p>시각화 로딩 중...</p>
        </div>
      </div>
    }>
      <VisualizationContent />
    </Suspense>
  )
}
