/**
 * 레이어 분류 유틸리티
 * 파일 경로를 기반으로 레이어 타입을 추론
 *
 * 사용처:
 * - lib/skott-analyzer.ts
 * - components/visualization/ReactFlowDiagram.tsx
 * - app/api/logic-flow/ast/route.ts
 * - app/api/logic-flow/analyze/route.ts
 * - app/api/logic-flow/analyze/graphql/route.ts
 * - app/api/logic-flow/analyze/quick/route.ts
 */

import type { LayerType } from './colors'

/**
 * 파일 경로에서 레이어 타입을 추론
 *
 * @param path - 파일 경로 (예: 'src/components/Button.tsx')
 * @returns LayerType - 추론된 레이어 타입
 *
 * 레이어 우선순위:
 * 1. api - API Routes (/api/ + route.)
 * 2. ui - 컴포넌트, 페이지 (.tsx/.jsx)
 * 3. logic - hooks, services, stores
 * 4. lib - 유틸리티 라이브러리
 * 5. data - 데이터베이스 관련
 * 6. unknown - 기본값
 */
export function inferLayerFromPath(path: string): LayerType {
  const lowerPath = path.toLowerCase()

  // 1. API 라우트 (최우선)
  if (lowerPath.includes('/api/') && lowerPath.includes('route.')) {
    return 'api'
  }

  // 2. Server 레이어 (API route가 아닌 서버 코드)
  if (
    (lowerPath.includes('api/') || lowerPath.includes('server')) &&
    !lowerPath.includes('route.')
  ) {
    return 'server'
  }

  // 3. UI 레이어
  if (
    lowerPath.includes('/components/') ||
    lowerPath.includes('/pages/') ||
    (lowerPath.includes('/app/') && !lowerPath.includes('/api/')) ||
    lowerPath.includes('page.tsx') ||
    lowerPath.includes('page.jsx')
  ) {
    return 'ui'
  }

  // 4. Logic 레이어
  if (
    lowerPath.includes('/hooks/') ||
    lowerPath.includes('/services/') ||
    lowerPath.includes('/stores/') ||
    lowerPath.includes('hook') ||
    lowerPath.includes('service')
  ) {
    return 'logic'
  }

  // 5. Lib/Utils 레이어
  if (
    lowerPath.includes('/lib/') ||
    lowerPath.includes('/utils/') ||
    lowerPath.includes('/helpers/') ||
    lowerPath.includes('util') ||
    lowerPath.includes('helper')
  ) {
    return 'lib'
  }

  // 6. Data 레이어
  if (
    lowerPath.includes('/db/') ||
    lowerPath.includes('/database/') ||
    lowerPath.includes('/models/') ||
    lowerPath.includes('/schema/') ||
    lowerPath.includes('store') ||
    lowerPath.includes('state')
  ) {
    return 'data'
  }

  // 7. TSX/JSX 파일은 UI로 분류 (폴백)
  if (lowerPath.match(/\.(tsx|jsx)$/)) {
    return 'ui'
  }

  return 'unknown'
}

/**
 * 빠른 레이어 분류 (간소화 버전)
 * Quick 분석용으로 최소한의 규칙만 적용
 */
export function inferLayerQuick(path: string): LayerType {
  const lowerPath = path.toLowerCase()

  if (lowerPath.includes('component') || lowerPath.includes('page') ||
      lowerPath.match(/\.(tsx|jsx)$/)) {
    return 'ui'
  }

  if (lowerPath.includes('api') || lowerPath.includes('route')) {
    return 'server'
  }

  if (lowerPath.includes('model') || lowerPath.includes('store') ||
      lowerPath.includes('db')) {
    return 'data'
  }

  return 'logic'
}

/**
 * 레이어 표시 이름 반환
 */
export function getLayerDisplayName(layer: LayerType): string {
  const displayNames: Record<LayerType, string> = {
    ui: 'UI 레이어',
    logic: 'Logic 레이어',
    server: 'Server 레이어',
    api: 'API 레이어',
    data: 'Data 레이어',
    lib: 'Library 레이어',
    unknown: '기타',
  }
  return displayNames[layer]
}

/**
 * 레이어 아이콘 반환
 */
export function getLayerIcon(layer: LayerType): string {
  const icons: Record<LayerType, string> = {
    ui: '🖥️',
    logic: '⚙️',
    server: '🌐',
    api: '🔌',
    data: '💾',
    lib: '📚',
    unknown: '❓',
  }
  return icons[layer]
}
