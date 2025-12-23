'use client'

/**
 * AIExplainer - AI 설명 패널
 * 비개발자를 위해 코드/다이어그램을 쉬운 말로 설명
 */

import { useState, useCallback } from 'react'
import { AnalysisResult, ModuleInfo, FunctionInfo } from '@/lib/types'
import { LAYER_COLORS_EXTENDED, LAYER_NAMES, LayerType } from '@/lib/colors'

interface AIExplainerProps {
  analysisResult?: AnalysisResult
  selectedModule?: ModuleInfo
  selectedFunction?: FunctionInfo
  onExplainRequest?: (context: ExplainContext) => Promise<string>
}

interface ExplainContext {
  type: 'overview' | 'module' | 'function' | 'connection' | 'risk'
  data: Record<string, unknown>
}

interface ExplanationCard {
  id: string
  title: string
  explanation: string
  context: string
  isLoading: boolean
  timestamp: Date
}

export function AIExplainer({
  analysisResult,
  selectedModule,
  selectedFunction,
  onExplainRequest,
}: AIExplainerProps) {
  const [explanations, setExplanations] = useState<ExplanationCard[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 기본 설명 생성 (AI 없이도 동작)
  const generateDefaultExplanation = useCallback((context: ExplainContext): string => {
    switch (context.type) {
      case 'overview':
        if (!analysisResult) return '분석 결과가 없습니다.'
        return `이 프로젝트는 총 ${analysisResult.stats.totalModules}개의 모듈로 구성되어 있습니다. ` +
          `${analysisResult.stats.totalFunctions}개의 함수가 있으며, ` +
          `${analysisResult.stats.circularCount}개의 순환 의존성과 ` +
          `${analysisResult.stats.riskCount}개의 위험 지점이 발견되었습니다.`

      case 'module':
        const mod = context.data as unknown as ModuleInfo
        return `${mod.name}은(는) ${LAYER_NAMES[mod.type as LayerType] || '알 수 없는'} 레이어의 모듈입니다. ` +
          `${mod.functions?.length || 0}개의 함수를 포함하고 있으며, ` +
          `${mod.dependencies?.length || 0}개의 다른 모듈에 의존합니다. ` +
          `${mod.dependents?.length || 0}개의 모듈이 이 모듈을 사용합니다.`

      case 'function':
        const func = context.data as unknown as FunctionInfo
        return `${func.name}은(는) ${func.isAsync ? '비동기' : '동기'} 함수입니다. ` +
          `${func.isExported ? '다른 파일에서 사용할 수 있도록 내보내졌습니다.' : '이 파일 내부에서만 사용됩니다.'} ` +
          `복잡도: ${func.complexity || '알 수 없음'}`

      case 'connection':
        return `이 연결은 모듈 간의 의존 관계를 나타냅니다. ` +
          `화살표 방향은 "사용하는 쪽 → 사용되는 쪽"을 의미합니다.`

      case 'risk':
        return `이 위험 지점은 잠재적인 오류 발생 가능성을 나타냅니다. ` +
          `코드 리뷰나 테스트 강화가 권장됩니다.`

      default:
        return '설명을 생성할 수 없습니다.'
    }
  }, [analysisResult])

  // 설명 요청
  const requestExplanation = useCallback(async (
    type: ExplainContext['type'],
    title: string,
    contextData: string,
    data: Record<string, unknown> = {}
  ) => {
    const id = `${type}-${Date.now()}`
    const context: ExplainContext = { type, data }

    // 로딩 상태 추가
    setExplanations(prev => [{
      id,
      title,
      explanation: '',
      context: contextData,
      isLoading: true,
      timestamp: new Date(),
    }, ...prev].slice(0, 10)) // 최대 10개 유지

    setIsLoading(true)

    try {
      let explanation: string

      if (onExplainRequest) {
        // AI 설명 요청
        explanation = await onExplainRequest(context)
      } else {
        // 기본 설명 사용
        await new Promise(resolve => setTimeout(resolve, 500)) // 로딩 효과
        explanation = generateDefaultExplanation(context)
      }

      setExplanations(prev =>
        prev.map(e =>
          e.id === id
            ? { ...e, explanation, isLoading: false }
            : e
        )
      )
    } catch {
      setExplanations(prev =>
        prev.map(e =>
          e.id === id
            ? { ...e, explanation: '설명을 가져오는 중 오류가 발생했습니다.', isLoading: false }
            : e
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [onExplainRequest, generateDefaultExplanation])

  // 빠른 설명 버튼들
  const quickExplainButtons = [
    {
      label: '프로젝트 개요',
      type: 'overview' as const,
      getData: () => ({ analysisResult }),
      getContext: () => '전체 프로젝트 구조',
    },
    {
      label: '선택된 모듈',
      type: 'module' as const,
      getData: () => selectedModule ? { ...selectedModule } : {},
      getContext: () => selectedModule?.name || '선택 없음',
      disabled: !selectedModule,
    },
    {
      label: '선택된 함수',
      type: 'function' as const,
      getData: () => selectedFunction ? { ...selectedFunction } : {},
      getContext: () => selectedFunction?.name || '선택 없음',
      disabled: !selectedFunction,
    },
    {
      label: '위험 지점',
      type: 'risk' as const,
      getData: () => ({ riskPoints: analysisResult?.riskPoints }),
      getContext: () => `${analysisResult?.riskPoints.length || 0}개 위험 지점`,
      disabled: !analysisResult?.riskPoints.length,
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm" data-testid="ai-explainer">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            AI 설명
          </h2>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              설명 생성 중...
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-1">
          복잡한 코드 구조를 쉬운 말로 설명해 드립니다
        </p>
      </div>

      {/* 빠른 설명 버튼 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {quickExplainButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => requestExplanation(btn.type, btn.label, btn.getContext(), btn.getData())}
              disabled={btn.disabled || isLoading}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                btn.disabled || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 설명 카드들 */}
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {explanations.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">💡</div>
            <div className="text-sm">
              위의 버튼을 클릭하여 코드 구조에 대한 설명을 받아보세요
            </div>
          </div>
        ) : (
          explanations.map((card) => (
            <div
              key={card.id}
              className="p-4 rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-white"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{card.title}</h3>
                  <span className="text-xs text-gray-500">{card.context}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {card.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {card.isLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">설명을 생성하고 있습니다...</span>
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {card.explanation}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* 선택된 모듈/함수 정보 */}
      {(selectedModule || selectedFunction) && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="text-xs font-medium text-gray-500 mb-2">현재 선택</h4>
          <div className="flex flex-wrap gap-2">
            {selectedModule && (
              <span
                className="px-2 py-1 text-xs rounded"
                style={{
                  backgroundColor: LAYER_COLORS_EXTENDED[selectedModule.type as LayerType]?.light,
                  color: LAYER_COLORS_EXTENDED[selectedModule.type as LayerType]?.text,
                }}
              >
                📦 {selectedModule.name}
              </span>
            )}
            {selectedFunction && (
              <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">
                ⚡ {selectedFunction.name}()
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AIExplainer
