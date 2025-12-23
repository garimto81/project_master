'use client'

/**
 * CodeSync - 코드-다이어그램 동기화
 * 코드 에디터와 다이어그램 간의 양방향 동기화
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { AnalysisResult, ModuleInfo, FunctionInfo } from '@/lib/types'
import { LAYER_COLORS_EXTENDED, LAYER_NAMES, LayerType } from '@/lib/colors'

interface CodeSyncProps {
  analysisResult: AnalysisResult
  code?: string
  selectedPath?: string
  onPathSelect?: (path: string) => void
  onLineSelect?: (line: number) => void
  onDiagramNodeClick?: (nodeId: string) => void
}

interface CodeLine {
  number: number
  content: string
  module?: string
  function?: string
  isImport?: boolean
  isExport?: boolean
  isHighlighted?: boolean
}

interface SyncState {
  mode: 'code-to-diagram' | 'diagram-to-code' | 'bidirectional'
  linkedModule: string | null
  linkedLine: number | null
  linkedFunction: string | null
}

export function CodeSync({
  analysisResult,
  code = '',
  selectedPath,
  onPathSelect,
  onLineSelect,
  onDiagramNodeClick,
}: CodeSyncProps) {
  const [syncState, setSyncState] = useState<SyncState>({
    mode: 'bidirectional',
    linkedModule: null,
    linkedLine: null,
    linkedFunction: null,
  })
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const codeContainerRef = useRef<HTMLDivElement>(null)

  // 코드를 라인별로 파싱
  const codeLines: CodeLine[] = code.split('\n').map((content, index) => {
    const lineNumber = index + 1
    const isImport = /^import\s/.test(content.trim())
    const isExport = /^export\s/.test(content.trim())

    return {
      number: lineNumber,
      content,
      isImport,
      isExport,
      isHighlighted: syncState.linkedLine === lineNumber,
    }
  })

  // 현재 모듈 정보
  const currentModule = selectedPath
    ? analysisResult.layers
        .flatMap(l => l.modules)
        .find(m => m.path === selectedPath)
    : null

  // 라인 클릭 핸들러
  const handleLineClick = useCallback((lineNumber: number) => {
    setSyncState(prev => ({
      ...prev,
      linkedLine: lineNumber,
    }))
    onLineSelect?.(lineNumber)

    // 해당 라인의 함수 찾기 (간단한 휴리스틱)
    const line = codeLines[lineNumber - 1]
    if (line?.content.includes('function ') || line?.content.includes('const ')) {
      const funcMatch = line.content.match(/(?:function|const)\s+(\w+)/)
      if (funcMatch) {
        setSyncState(prev => ({
          ...prev,
          linkedFunction: funcMatch[1],
        }))
      }
    }
  }, [codeLines, onLineSelect])

  // 다이어그램 노드 선택 시 코드 스크롤
  const scrollToModule = useCallback((modulePath: string) => {
    setSyncState(prev => ({
      ...prev,
      linkedModule: modulePath,
    }))
    onPathSelect?.(modulePath)
  }, [onPathSelect])

  // 미니맵에 모듈 표시
  const MinimapView = () => {
    const totalLines = codeLines.length
    const moduleRanges = currentModule?.functions?.map(f => ({
      name: f.name,
      start: Math.floor(Math.random() * totalLines * 0.8),
      end: Math.floor(Math.random() * totalLines * 0.2) + 10,
    })) || []

    return (
      <div className="w-16 bg-gray-100 rounded overflow-hidden relative h-full">
        {/* 전체 코드 영역 */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-gray-100"></div>

        {/* 함수 영역 표시 */}
        {moduleRanges.map((range, index) => (
          <div
            key={range.name}
            className="absolute left-1 right-1 opacity-60"
            style={{
              top: `${(range.start / totalLines) * 100}%`,
              height: `${(range.end / totalLines) * 100}%`,
              backgroundColor: LAYER_COLORS_EXTENDED[currentModule?.type as LayerType || 'unknown'].bg,
            }}
            title={range.name}
          />
        ))}

        {/* 현재 뷰포트 */}
        <div
          className="absolute left-0 right-0 bg-blue-500 opacity-20 border border-blue-500"
          style={{
            top: '20%',
            height: '15%',
          }}
        />

        {/* 현재 선택된 라인 */}
        {syncState.linkedLine && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-red-500"
            style={{
              top: `${(syncState.linkedLine / totalLines) * 100}%`,
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm" data-testid="code-sync">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            코드-다이어그램 동기화
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={syncState.mode}
              onChange={(e) => setSyncState(prev => ({
                ...prev,
                mode: e.target.value as SyncState['mode'],
              }))}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="bidirectional">양방향</option>
              <option value="code-to-diagram">코드 → 다이어그램</option>
              <option value="diagram-to-code">다이어그램 → 코드</option>
            </select>
            <button
              onClick={() => setShowMinimap(!showMinimap)}
              className={`px-2 py-1 text-sm rounded ${
                showMinimap ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              미니맵
            </button>
          </div>
        </div>

        {/* 현재 모듈 정보 */}
        {currentModule && (
          <div className="mt-2 flex items-center gap-2">
            <span
              className="px-2 py-0.5 text-xs rounded"
              style={{
                backgroundColor: LAYER_COLORS_EXTENDED[currentModule.type as LayerType]?.light,
                color: LAYER_COLORS_EXTENDED[currentModule.type as LayerType]?.text,
              }}
            >
              {LAYER_NAMES[currentModule.type as LayerType]}
            </span>
            <span className="text-sm text-gray-600">{currentModule.name}</span>
            <span className="text-xs text-gray-400">{selectedPath}</span>
          </div>
        )}
      </div>

      {/* 본문: 코드 뷰어 + 미니맵 */}
      <div className="flex" style={{ height: '400px' }}>
        {/* 코드 뷰어 */}
        <div
          ref={codeContainerRef}
          className="flex-1 overflow-auto font-mono text-sm"
        >
          {code ? (
            <table className="w-full">
              <tbody>
                {codeLines.map((line) => (
                  <tr
                    key={line.number}
                    className={`
                      cursor-pointer transition-colors
                      ${line.isHighlighted ? 'bg-yellow-100' : ''}
                      ${hoveredLine === line.number ? 'bg-blue-50' : ''}
                      ${line.isImport ? 'text-purple-700' : ''}
                      ${line.isExport ? 'text-green-700' : ''}
                    `}
                    onClick={() => handleLineClick(line.number)}
                    onMouseEnter={() => setHoveredLine(line.number)}
                    onMouseLeave={() => setHoveredLine(null)}
                  >
                    <td className="px-2 py-0.5 text-right text-gray-400 select-none w-12 border-r border-gray-200">
                      {line.number}
                    </td>
                    <td className="px-3 py-0.5 whitespace-pre">
                      {line.content || ' '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📄</div>
                <div>파일을 선택하면 코드가 표시됩니다</div>
              </div>
            </div>
          )}
        </div>

        {/* 미니맵 */}
        {showMinimap && code && (
          <div className="w-20 border-l border-gray-200 p-2">
            <MinimapView />
          </div>
        )}
      </div>

      {/* 동기화 상태 표시 */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            {syncState.linkedModule && (
              <span className="text-gray-600">
                모듈: <strong>{syncState.linkedModule.split('/').pop()}</strong>
              </span>
            )}
            {syncState.linkedLine && (
              <span className="text-gray-600">
                라인: <strong>{syncState.linkedLine}</strong>
              </span>
            )}
            {syncState.linkedFunction && (
              <span className="text-gray-600">
                함수: <strong>{syncState.linkedFunction}()</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              syncState.mode === 'bidirectional' ? 'bg-green-500' :
              syncState.mode === 'code-to-diagram' ? 'bg-blue-500' : 'bg-purple-500'
            }`}></span>
            <span className="text-gray-500">
              {syncState.mode === 'bidirectional' ? '양방향 동기화' :
               syncState.mode === 'code-to-diagram' ? '코드 → 다이어그램' : '다이어그램 → 코드'}
            </span>
          </div>
        </div>
      </div>

      {/* 연결된 모듈 목록 */}
      {currentModule?.dependencies && currentModule.dependencies.length > 0 && (
        <div className="p-3 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-500 mb-2">연결된 모듈</h4>
          <div className="flex flex-wrap gap-1">
            {currentModule.dependencies.slice(0, 5).map((dep) => (
              <button
                key={dep}
                onClick={() => scrollToModule(dep)}
                className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                → {dep.split('/').pop()}
              </button>
            ))}
            {currentModule.dependencies.length > 5 && (
              <span className="px-2 py-0.5 text-xs text-gray-400">
                +{currentModule.dependencies.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CodeSync
