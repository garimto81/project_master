'use client'

/**
 * VersionCompare - Before/After 비교 시각화
 * AI 수정 전후 로직 변화를 나란히 표시
 */

import { useState, useMemo } from 'react'
import { AnalysisResult } from '@/lib/types'
import { LAYER_COLORS_EXTENDED, LAYER_NAMES, LayerType } from '@/lib/colors'

interface VersionCompareProps {
  before: AnalysisResult
  after: AnalysisResult
  title?: string
}

interface DiffItem {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  path: string
  layer: LayerType
  beforeValue?: string
  afterValue?: string
  description?: string
}

export function VersionCompare({ before, after, title }: VersionCompareProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split')
  const [filterType, setFilterType] = useState<'all' | 'added' | 'removed' | 'modified'>('all')

  // 변경사항 계산
  const diff = useMemo(() => {
    const items: DiffItem[] = []
    const beforeModules = new Map(
      before.layers.flatMap(l => l.modules.map(m => [m.path, { ...m, layer: l.type }]))
    )
    const afterModules = new Map(
      after.layers.flatMap(l => l.modules.map(m => [m.path, { ...m, layer: l.type }]))
    )

    // 추가된 모듈
    afterModules.forEach((module, path) => {
      if (!beforeModules.has(path)) {
        items.push({
          type: 'added',
          path,
          layer: module.layer,
          afterValue: module.name,
          description: `새 모듈 추가: ${module.name}`,
        })
      }
    })

    // 삭제된 모듈
    beforeModules.forEach((module, path) => {
      if (!afterModules.has(path)) {
        items.push({
          type: 'removed',
          path,
          layer: module.layer,
          beforeValue: module.name,
          description: `모듈 삭제: ${module.name}`,
        })
      }
    })

    // 수정된 모듈
    beforeModules.forEach((beforeModule, path) => {
      const afterModule = afterModules.get(path)
      if (afterModule) {
        const beforeDeps = beforeModule.dependencies?.length || 0
        const afterDeps = afterModule.dependencies?.length || 0
        const beforeFuncs = beforeModule.functions?.length || 0
        const afterFuncs = afterModule.functions?.length || 0

        if (beforeDeps !== afterDeps || beforeFuncs !== afterFuncs) {
          items.push({
            type: 'modified',
            path,
            layer: beforeModule.layer,
            beforeValue: `의존성: ${beforeDeps}, 함수: ${beforeFuncs}`,
            afterValue: `의존성: ${afterDeps}, 함수: ${afterFuncs}`,
            description: `${beforeModule.name} 수정됨`,
          })
        }
      }
    })

    return items
  }, [before, after])

  // 연결 변경사항 계산
  const connectionDiff = useMemo(() => {
    const beforeConns = new Set(before.connections.map(c => `${c.from}->${c.to}`))
    const afterConns = new Set(after.connections.map(c => `${c.from}->${c.to}`))

    return {
      added: after.connections.filter(c => !beforeConns.has(`${c.from}->${c.to}`)),
      removed: before.connections.filter(c => !afterConns.has(`${c.from}->${c.to}`)),
    }
  }, [before, after])

  // 필터된 diff
  const filteredDiff = useMemo(() => {
    if (filterType === 'all') return diff
    return diff.filter(item => item.type === filterType)
  }, [diff, filterType])

  // 통계
  const stats = useMemo(() => ({
    added: diff.filter(d => d.type === 'added').length,
    removed: diff.filter(d => d.type === 'removed').length,
    modified: diff.filter(d => d.type === 'modified').length,
    connectionsAdded: connectionDiff.added.length,
    connectionsRemoved: connectionDiff.removed.length,
    circularBefore: before.circularDependencies.length,
    circularAfter: after.circularDependencies.length,
  }), [diff, connectionDiff, before, after])

  const getDiffColor = (type: DiffItem['type']) => {
    switch (type) {
      case 'added': return 'bg-green-50 border-green-200 text-green-800'
      case 'removed': return 'bg-red-50 border-red-200 text-red-800'
      case 'modified': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getDiffIcon = (type: DiffItem['type']) => {
    switch (type) {
      case 'added': return '+'
      case 'removed': return '-'
      case 'modified': return '~'
      default: return '='
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm" data-testid="version-compare">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {title || '버전 비교'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'split' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              분할 뷰
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'unified' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              통합 뷰
            </button>
          </div>
        </div>

        {/* 요약 통계 */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-600">추가: {stats.added}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-sm text-gray-600">삭제: {stats.removed}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-sm text-gray-600">수정: {stats.modified}</span>
          </div>
          <div className="text-sm text-gray-500">
            | 연결: +{stats.connectionsAdded} / -{stats.connectionsRemoved}
          </div>
          {stats.circularBefore !== stats.circularAfter && (
            <div className="text-sm text-purple-600">
              순환 의존성: {stats.circularBefore} → {stats.circularAfter}
            </div>
          )}
        </div>

        {/* 필터 */}
        <div className="mt-3 flex gap-2">
          {(['all', 'added', 'removed', 'modified'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2 py-1 text-xs rounded ${
                filterType === type ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {type === 'all' ? '전체' : type === 'added' ? '추가' : type === 'removed' ? '삭제' : '수정'}
            </button>
          ))}
        </div>
      </div>

      {/* 본문 */}
      <div className="p-4">
        {viewMode === 'split' ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Before</h3>
              <div className="space-y-2">
                {before.layers.map(layer => (
                  <div
                    key={layer.type}
                    className="p-2 rounded border"
                    style={{
                      backgroundColor: LAYER_COLORS_EXTENDED[layer.type as LayerType]?.light || '#f9fafb',
                      borderColor: LAYER_COLORS_EXTENDED[layer.type as LayerType]?.border || '#e5e7eb',
                    }}
                  >
                    <div className="text-xs font-medium text-gray-700">
                      {LAYER_NAMES[layer.type as LayerType] || layer.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {layer.modules.length} 모듈
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">After</h3>
              <div className="space-y-2">
                {after.layers.map(layer => (
                  <div
                    key={layer.type}
                    className="p-2 rounded border"
                    style={{
                      backgroundColor: LAYER_COLORS_EXTENDED[layer.type as LayerType]?.light || '#f9fafb',
                      borderColor: LAYER_COLORS_EXTENDED[layer.type as LayerType]?.border || '#e5e7eb',
                    }}
                  >
                    <div className="text-xs font-medium text-gray-700">
                      {LAYER_NAMES[layer.type as LayerType] || layer.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {layer.modules.length} 모듈
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDiff.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                변경사항이 없습니다
              </div>
            ) : (
              filteredDiff.map((item, index) => (
                <div
                  key={`${item.path}-${index}`}
                  className={`p-3 rounded border ${getDiffColor(item.type)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-lg font-bold">
                      {getDiffIcon(item.type)}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.description}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.path}</div>
                      {item.type === 'modified' && (
                        <div className="mt-2 text-xs">
                          <div className="text-red-600">- {item.beforeValue}</div>
                          <div className="text-green-600">+ {item.afterValue}</div>
                        </div>
                      )}
                    </div>
                    <span
                      className="px-2 py-0.5 text-xs rounded"
                      style={{
                        backgroundColor: LAYER_COLORS_EXTENDED[item.layer]?.light,
                        color: LAYER_COLORS_EXTENDED[item.layer]?.text,
                      }}
                    >
                      {LAYER_NAMES[item.layer]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default VersionCompare
