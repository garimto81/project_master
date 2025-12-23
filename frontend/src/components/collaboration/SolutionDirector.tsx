'use client'

/**
 * SolutionDirector - 해결 방향 지시 기능
 * 비개발자가 AI에게 해결 방향을 제시할 수 있는 인터페이스
 */

import { useState, useCallback } from 'react'
import { IdentifiedProblem } from './ProblemAnalyzer'

interface SolutionDirectorProps {
  problems: IdentifiedProblem[]
  onDirectionSubmit?: (direction: SolutionDirection) => Promise<void>
  onCancel?: () => void
}

export interface SolutionDirection {
  problemIds: string[]
  approach: SolutionApproach
  priority: 'safety' | 'speed' | 'balance'
  constraints: string[]
  additionalNotes: string
  expectedOutcome: string
}

type SolutionApproach = 'fix' | 'refactor' | 'workaround' | 'ask' | 'delegate'

const APPROACH_OPTIONS: { value: SolutionApproach; label: string; icon: string; description: string }[] = [
  { value: 'fix', label: '직접 수정', icon: '🔧', description: 'AI가 코드를 직접 수정합니다' },
  { value: 'refactor', label: '구조 개선', icon: '♻️', description: '근본적인 구조를 개선합니다' },
  { value: 'workaround', label: '임시 해결', icon: '🔄', description: '당장 동작하게 임시 조치합니다' },
  { value: 'ask', label: '추가 분석', icon: '🔍', description: '더 자세한 분석을 요청합니다' },
  { value: 'delegate', label: '전문가 요청', icon: '👨‍💻', description: '개발자의 도움이 필요합니다' },
]

const CONSTRAINT_OPTIONS = [
  { id: 'no-breaking', label: '기존 기능 유지', description: '다른 기능에 영향 없이' },
  { id: 'minimal-change', label: '최소 변경', description: '가능한 적게 수정' },
  { id: 'add-tests', label: '테스트 추가', description: '테스트 코드도 함께' },
  { id: 'document', label: '문서화', description: '변경 내용 기록' },
  { id: 'review-needed', label: '검토 필요', description: '수정 전 확인 요청' },
]

export function SolutionDirector({
  problems,
  onDirectionSubmit,
  onCancel,
}: SolutionDirectorProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [direction, setDirection] = useState<Partial<SolutionDirection>>({
    problemIds: problems.map(p => p.id),
    approach: undefined,
    priority: 'balance',
    constraints: [],
    additionalNotes: '',
    expectedOutcome: '',
  })

  const updateDirection = useCallback(<K extends keyof SolutionDirection>(
    key: K,
    value: SolutionDirection[K]
  ) => {
    setDirection(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleConstraint = useCallback((constraintId: string) => {
    setDirection(prev => ({
      ...prev,
      constraints: prev.constraints?.includes(constraintId)
        ? prev.constraints.filter(c => c !== constraintId)
        : [...(prev.constraints || []), constraintId],
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!direction.approach) return

    setIsSubmitting(true)
    try {
      const completeDirection: SolutionDirection = {
        problemIds: direction.problemIds || [],
        approach: direction.approach,
        priority: direction.priority || 'balance',
        constraints: direction.constraints || [],
        additionalNotes: direction.additionalNotes || '',
        expectedOutcome: direction.expectedOutcome || '',
      }

      await onDirectionSubmit?.(completeDirection)
    } catch (error) {
      console.error('해결 방향 제출 실패:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [direction, onDirectionSubmit])

  const totalSteps = 4

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg max-w-lg w-full" data-testid="solution-director">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">해결 방향 지시</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              AI에게 어떻게 해결할지 알려주세요
            </p>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>

        {/* 진행 바 */}
        <div className="flex items-center gap-1 mt-4">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                index < step ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="text-xs text-gray-400 mt-1 text-right">
          {step} / {totalSteps}
        </div>
      </div>

      {/* 선택된 문제 표시 */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div className="text-xs text-gray-500 mb-1">해결할 문제:</div>
        <div className="flex flex-wrap gap-1">
          {problems.map(p => (
            <span
              key={p.id}
              className="px-2 py-0.5 text-xs rounded bg-white border border-gray-200"
            >
              {p.title}
            </span>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4">
        {/* Step 1: 접근 방식 선택 */}
        {step === 1 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">어떻게 해결하면 좋을까요?</h3>
            <div className="space-y-2">
              {APPROACH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    updateDirection('approach', option.value)
                    setStep(2)
                  }}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    direction.approach === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 우선순위 */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">무엇을 우선시할까요?</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'safety', label: '안전성', icon: '🛡️', description: '꼼꼼하게, 확실하게' },
                { value: 'speed', label: '속도', icon: '⚡', description: '빠르게 해결' },
                { value: 'balance', label: '균형', icon: '⚖️', description: '적절한 조화' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateDirection('priority', option.value as SolutionDirection['priority'])}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    direction.priority === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: 제약 조건 */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">지켜야 할 조건이 있나요?</h3>
            <div className="space-y-2">
              {CONSTRAINT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => toggleConstraint(option.id)}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    direction.constraints?.includes(option.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      direction.constraints?.includes(option.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {direction.constraints?.includes(option.id) && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: 추가 설명 */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">추가로 알려줄 내용</h3>
              <textarea
                value={direction.additionalNotes}
                onChange={(e) => updateDirection('additionalNotes', e.target.value)}
                placeholder="AI가 알아야 할 추가 정보가 있으면 적어주세요 (선택)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">기대하는 결과</h3>
              <textarea
                value={direction.expectedOutcome}
                onChange={(e) => updateDirection('expectedOutcome', e.target.value)}
                placeholder="해결되면 어떻게 동작해야 하나요? (선택)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* 요약 */}
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="font-medium text-gray-900 mb-2">요약</div>
              <div className="space-y-1 text-gray-600">
                <div>
                  접근: {APPROACH_OPTIONS.find(a => a.value === direction.approach)?.label}
                </div>
                <div>
                  우선순위: {direction.priority === 'safety' ? '안전성' :
                           direction.priority === 'speed' ? '속도' : '균형'}
                </div>
                {direction.constraints && direction.constraints.length > 0 && (
                  <div>
                    제약: {direction.constraints.map(c =>
                      CONSTRAINT_OPTIONS.find(o => o.id === c)?.label
                    ).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="p-4 border-t border-gray-200 flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← 이전
        </button>

        {step < totalSteps ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && !direction.approach}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            다음 →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '처리 중...' : '🚀 AI에게 지시'}
          </button>
        )}
      </div>
    </div>
  )
}

export default SolutionDirector
