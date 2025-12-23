'use client'

/**
 * ErrorTrace - 에러 경로 시각화
 * 에러 발생 시 어디서 문제가 생겼는지 경로 표시
 */

import { useState, useMemo } from 'react'
import { RiskPoint, AnalysisResult, ModuleInfo } from '@/lib/types'
import { LAYER_COLORS_EXTENDED, LAYER_NAMES, LayerType } from '@/lib/colors'

interface ErrorTraceProps {
  analysisResult: AnalysisResult
  errorPath?: string[]
  onPathClick?: (path: string) => void
}

interface TraceStep {
  index: number
  path: string
  moduleName: string
  layer: LayerType
  riskPoints: RiskPoint[]
  isError: boolean
}

export function ErrorTrace({ analysisResult, errorPath, onPathClick }: ErrorTraceProps) {
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [showAllRisks, setShowAllRisks] = useState(false)

  // 에러 경로를 트레이스 스텝으로 변환
  const traceSteps = useMemo((): TraceStep[] => {
    if (!errorPath || errorPath.length === 0) return []

    const moduleMap = new Map<string, ModuleInfo & { layer: LayerType }>()
    analysisResult.layers.forEach(layer => {
      layer.modules.forEach(module => {
        moduleMap.set(module.path, { ...module, layer: layer.type as LayerType })
      })
    })

    return errorPath.map((path, index) => {
      const module = moduleMap.get(path)
      const riskPoints = analysisResult.riskPoints.filter(rp => rp.path === path)
      const isError = index === errorPath.length - 1

      return {
        index,
        path,
        moduleName: module?.name || path.split('/').pop() || path,
        layer: module?.layer || 'unknown',
        riskPoints,
        isError,
      }
    })
  }, [errorPath, analysisResult])

  // 전체 위험 지점
  const allRiskPoints = useMemo(() => {
    return analysisResult.riskPoints.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }, [analysisResult.riskPoints])

  const getSeverityColor = (severity: RiskPoint['severity']) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getRiskTypeLabel = (type: RiskPoint['type']) => {
    switch (type) {
      case 'try-catch': return 'Try-Catch 누락'
      case 'null-check': return 'Null 체크 없음'
      case 'error-boundary': return 'Error Boundary 없음'
      case 'async-await': return 'Async 에러 처리'
      case 'type-assertion': return '타입 단언'
      default: return type
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm" data-testid="error-trace">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            에러 트레이스
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllRisks(!showAllRisks)}
              className={`px-3 py-1 text-sm rounded ${
                showAllRisks ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              전체 위험 지점 ({allRiskPoints.length})
            </button>
          </div>
        </div>

        {/* 위험 요약 */}
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-xs text-gray-600">
              High: {allRiskPoints.filter(r => r.severity === 'high').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="text-xs text-gray-600">
              Medium: {allRiskPoints.filter(r => r.severity === 'medium').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-xs text-gray-600">
              Low: {allRiskPoints.filter(r => r.severity === 'low').length}
            </span>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="p-4">
        {showAllRisks ? (
          /* 전체 위험 지점 목록 */
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allRiskPoints.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                탐지된 위험 지점이 없습니다
              </div>
            ) : (
              allRiskPoints.map((risk, index) => (
                <div
                  key={`${risk.path}-${risk.line}-${index}`}
                  className={`p-3 rounded border cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(risk.severity)}`}
                  onClick={() => onPathClick?.(risk.path)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{getRiskTypeLabel(risk.type)}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {risk.path}
                        {risk.line && `:${risk.line}`}
                      </div>
                      {risk.description && (
                        <div className="text-xs mt-1">{risk.description}</div>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                      risk.severity === 'high' ? 'bg-red-200' :
                      risk.severity === 'medium' ? 'bg-yellow-200' : 'bg-blue-200'
                    }`}>
                      {risk.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* 에러 경로 시각화 */
          <div>
            {traceSteps.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                에러 경로가 없습니다. 위험 지점을 확인하려면 &quot;전체 위험 지점&quot; 버튼을 클릭하세요.
              </div>
            ) : (
              <div className="relative">
                {/* 트레이스 라인 */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {/* 스텝들 */}
                <div className="space-y-4">
                  {traceSteps.map((step, index) => (
                    <div
                      key={step.path}
                      className={`relative pl-14 cursor-pointer ${
                        selectedStep === index ? 'scale-105' : ''
                      } transition-transform`}
                      onClick={() => {
                        setSelectedStep(selectedStep === index ? null : index)
                        onPathClick?.(step.path)
                      }}
                    >
                      {/* 노드 */}
                      <div
                        className={`absolute left-4 w-5 h-5 rounded-full border-2 ${
                          step.isError
                            ? 'bg-red-500 border-red-600'
                            : step.riskPoints.length > 0
                            ? 'bg-yellow-400 border-yellow-500'
                            : 'bg-white border-gray-300'
                        }`}
                        style={{
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      >
                        {step.isError && (
                          <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                            !
                          </span>
                        )}
                      </div>

                      {/* 화살표 */}
                      {index < traceSteps.length - 1 && (
                        <div className="absolute left-[22px] top-full w-0.5 h-4 bg-gray-300">
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300"></div>
                        </div>
                      )}

                      {/* 카드 */}
                      <div
                        className={`p-3 rounded-lg border ${
                          step.isError
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-200'
                        } hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {step.moduleName}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {step.path}
                            </div>
                          </div>
                          <span
                            className="px-2 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: LAYER_COLORS_EXTENDED[step.layer]?.light,
                              color: LAYER_COLORS_EXTENDED[step.layer]?.text,
                            }}
                          >
                            {LAYER_NAMES[step.layer]}
                          </span>
                        </div>

                        {/* 위험 지점 */}
                        {step.riskPoints.length > 0 && selectedStep === index && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            {step.riskPoints.map((risk, rIndex) => (
                              <div
                                key={rIndex}
                                className={`px-2 py-1 rounded text-xs ${getSeverityColor(risk.severity)}`}
                              >
                                {getRiskTypeLabel(risk.type)}
                                {risk.line && ` (line ${risk.line})`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorTrace
