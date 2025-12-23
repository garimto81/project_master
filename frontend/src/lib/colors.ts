/**
 * 시각화 레이어 색상 정의
 * 모든 시각화 컴포넌트에서 공유
 */

export type LayerType = 'ui' | 'logic' | 'server' | 'api' | 'data' | 'lib' | 'unknown'

export interface LayerColor {
  fill: string
  stroke: string
  text: string
}

export interface LayerColorExtended extends LayerColor {
  bg: string
  border: string
  light: string
}

// Mermaid 다이어그램용 색상 (fill/stroke/text)
export const LAYER_COLORS: Record<LayerType, LayerColor> = {
  ui: { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' },
  logic: { fill: '#dcfce7', stroke: '#22c55e', text: '#166534' },
  server: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e' },
  api: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e' },
  data: { fill: '#fce7f3', stroke: '#ec4899', text: '#9d174d' },
  lib: { fill: '#f3e8ff', stroke: '#a855f7', text: '#7c3aed' },
  unknown: { fill: '#f3f4f6', stroke: '#9ca3af', text: '#4b5563' },
}

// 인터랙티브 컴포넌트용 확장 색상 (bg/border/text/light)
export const LAYER_COLORS_EXTENDED: Record<LayerType, LayerColorExtended> = {
  ui: { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af', bg: '#3b82f6', border: '#2563eb', light: '#eff6ff' },
  logic: { fill: '#dcfce7', stroke: '#22c55e', text: '#166534', bg: '#22c55e', border: '#16a34a', light: '#f0fdf4' },
  server: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e', bg: '#f59e0b', border: '#d97706', light: '#fffbeb' },
  api: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e', bg: '#f59e0b', border: '#d97706', light: '#fffbeb' },
  data: { fill: '#fce7f3', stroke: '#ec4899', text: '#9d174d', bg: '#ec4899', border: '#db2777', light: '#fdf2f8' },
  lib: { fill: '#f3e8ff', stroke: '#a855f7', text: '#7c3aed', bg: '#a855f7', border: '#9333ea', light: '#faf5ff' },
  unknown: { fill: '#f3f4f6', stroke: '#9ca3af', text: '#4b5563', bg: '#9ca3af', border: '#6b7280', light: '#f9fafb' },
}

// 레이어 한글 이름
export const LAYER_NAMES: Record<LayerType, string> = {
  ui: 'UI 레이어',
  logic: '로직 레이어',
  server: 'API 레이어',
  api: 'API 레이어',
  data: '데이터 레이어',
  lib: '라이브러리',
  unknown: '기타',
}

// 시각화 제한 상수
export const VISUALIZATION_LIMITS = {
  MAX_NODES_DISPLAY: 8,
  MAX_EDGES_DISPLAY: 30,
  MAX_CIRCULAR_DEPS_DISPLAY: 3,
  MAX_MODULES_PER_LAYER: 4,
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 3,
} as const
