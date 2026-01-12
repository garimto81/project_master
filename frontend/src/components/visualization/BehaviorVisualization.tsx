'use client'

/**
 * BehaviorVisualization - 행동 중심 시각화 컨테이너
 * PRD-0008: "코드가 어떻게 작동하는가" 시각화
 *
 * 4가지 뷰:
 * 1. 기능 흐름 (P0) - JourneyView
 * 2. 영향 분석 (P1) - ImpactView
 * 3. 데이터 추적 (P2) - DataFlowView
 * 4. 문제 해결 (P3) - TroubleshootView
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'

const JourneyView = dynamic(
  () => import('@/components/visualization/JourneyView'),
  { ssr: false }
)

// ============================================================
// 타입 정의
// ============================================================

type ViewMode = 'journey' | 'impact' | 'dataflow' | 'troubleshoot'

interface ViewOption {
  id: ViewMode
  label: string
  icon: string
  description: string
  priority: string
  available: boolean
}

interface BehaviorVisualizationProps {
  repo: string
  onClose?: () => void
}

// ============================================================
// 뷰 옵션
// ============================================================

const VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'journey',
    label: '기능 흐름',
    icon: '📖',
    description: '이 기능이 어떻게 작동하는가?',
    priority: 'P0',
    available: true,
  },
  {
    id: 'impact',
    label: '영향 분석',
    icon: '⚠️',
    description: '이걸 바꾸면 뭐가 깨지는가?',
    priority: 'P1',
    available: false, // Phase 2에서 구현
  },
  {
    id: 'dataflow',
    label: '데이터 추적',
    icon: '📊',
    description: '이 데이터가 어디서 오는가?',
    priority: 'P2',
    available: false, // Phase 3에서 구현
  },
  {
    id: 'troubleshoot',
    label: '문제 해결',
    icon: '🔍',
    description: '문제가 생기면 어디 봐야하는가?',
    priority: 'P3',
    available: false, // Phase 3에서 구현
  },
]

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function BehaviorVisualization({ repo, onClose }: BehaviorVisualizationProps) {
  const [activeView, setActiveView] = useState<ViewMode>('journey')

  return (
    <div
      data-testid="behavior-visualization"
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '2px solid #3b82f6',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <div style={{
        padding: '16px 24px',
        background: 'linear-gradient(to right, #3b82f6, #2563eb)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>
            🎯 행동 중심 시각화
          </h2>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
            비개발자를 위한 코드 작동 방식 시각화
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ✕ 닫기
          </button>
        )}
      </div>

      {/* 탭 바 */}
      <div style={{
        padding: '12px 24px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
      }}>
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => option.available && setActiveView(option.id)}
            disabled={!option.available}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: activeView === option.id ? '#3b82f6' : '#fff',
              color: activeView === option.id ? '#fff' : option.available ? '#1e293b' : '#94a3b8',
              border: `1px solid ${activeView === option.id ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: '8px',
              cursor: option.available ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              opacity: option.available ? 1 : 0.6,
            }}
          >
            <span>{option.icon}</span>
            <span>{option.label}</span>
            {!option.available && (
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: '#f1f5f9',
                borderRadius: '4px',
                color: '#64748b',
              }}>
                준비중
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 현재 뷰 설명 */}
      <div style={{
        padding: '16px 24px',
        background: '#eff6ff',
        borderBottom: '1px solid #bfdbfe',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>
            {VIEW_OPTIONS.find(v => v.id === activeView)?.icon}
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e40af' }}>
              {VIEW_OPTIONS.find(v => v.id === activeView)?.description}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#3b82f6' }}>
              {VIEW_OPTIONS.find(v => v.id === activeView)?.priority} - 핵심 질문에 대한 답변
            </p>
          </div>
        </div>
      </div>

      {/* 뷰 콘텐츠 */}
      <div style={{ padding: '24px' }}>
        {activeView === 'journey' && (
          <JourneyView repo={repo} />
        )}

        {activeView === 'impact' && (
          <ComingSoonView
            icon="⚠️"
            title="영향 분석"
            description="이 기능은 Phase 2에서 구현될 예정입니다."
            features={[
              '역방향 BFS로 호출자 추적',
              '삭제 시 영향받는 기능 목록',
              '위험도 표시 (High/Medium/Low)',
            ]}
          />
        )}

        {activeView === 'dataflow' && (
          <ComingSoonView
            icon="📊"
            title="데이터 추적"
            description="이 기능은 Phase 3에서 구현될 예정입니다."
            features={[
              '변수의 출발점 추적',
              '데이터 변환 과정 표시',
              '최종 사용처 확인',
            ]}
          />
        )}

        {activeView === 'troubleshoot' && (
          <ComingSoonView
            icon="🔍"
            title="문제 해결"
            description="이 기능은 Phase 3에서 구현될 예정입니다."
            features={[
              '문제별 체크리스트 생성',
              '관련 파일/라인 표시',
              '단계별 디버깅 가이드',
            ]}
          />
        )}
      </div>

      {/* 푸터 */}
      <div style={{
        padding: '16px 24px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#64748b',
      }}>
        <span>
          PRD-0008: 행동 중심 코드 시각화 시스템
        </span>
        <span>
          📍 {repo}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// Coming Soon 컴포넌트
// ============================================================

interface ComingSoonViewProps {
  icon: string
  title: string
  description: string
  features: string[]
}

function ComingSoonView({ icon, title, description, features }: ComingSoonViewProps) {
  return (
    <div style={{
      padding: '60px 40px',
      textAlign: 'center',
      background: '#f8fafc',
      borderRadius: '12px',
      border: '2px dashed #e2e8f0',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px', fontSize: '1.5rem', color: '#1e293b' }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 32px', color: '#64748b' }}>
        {description}
      </p>

      <div style={{
        display: 'inline-block',
        textAlign: 'left',
        padding: '20px 32px',
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>
          예정된 기능:
        </h4>
        <ul style={{
          margin: 0,
          paddingLeft: '20px',
          color: '#1e293b',
          lineHeight: '1.8',
        }}>
          {features.map((feature, idx) => (
            <li key={idx}>{feature}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
