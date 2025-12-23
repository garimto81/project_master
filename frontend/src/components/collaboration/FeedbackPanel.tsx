'use client'

/**
 * FeedbackPanel - 사용자 피드백 수집 UI
 * 비개발자가 쉽게 문제점이나 개선사항을 전달할 수 있는 인터페이스
 */

import { useState, useCallback } from 'react'

interface FeedbackPanelProps {
  context?: string  // 현재 컨텍스트 (파일 경로, 모듈명 등)
  onSubmit?: (feedback: FeedbackData) => Promise<void>
  onCancel?: () => void
}

export interface FeedbackData {
  type: 'bug' | 'improvement' | 'question' | 'other'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  expectedBehavior?: string
  actualBehavior?: string
  steps?: string[]
  context?: string
  screenshot?: string  // base64
  createdAt: Date
}

const FEEDBACK_TYPES = [
  { value: 'bug', label: '버그 신고', icon: '🐛', description: '예상과 다르게 동작해요' },
  { value: 'improvement', label: '개선 제안', icon: '💡', description: '더 좋게 만들 수 있어요' },
  { value: 'question', label: '질문', icon: '❓', description: '이해가 안 돼요' },
  { value: 'other', label: '기타', icon: '📝', description: '다른 의견이 있어요' },
] as const

const PRIORITY_LEVELS = [
  { value: 'low', label: '낮음', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: '보통', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: '높음', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: '긴급', color: 'bg-red-100 text-red-700' },
] as const

export function FeedbackPanel({ context, onSubmit, onCancel }: FeedbackPanelProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Partial<FeedbackData>>({
    type: undefined,
    priority: 'medium',
    title: '',
    description: '',
    expectedBehavior: '',
    actualBehavior: '',
    steps: [],
    context,
  })
  const [currentStep, setCurrentStep] = useState('')

  // 타입 선택
  const handleTypeSelect = (type: FeedbackData['type']) => {
    setFeedback(prev => ({ ...prev, type }))
    setStep(2)
  }

  // 필드 업데이트
  const updateField = useCallback((field: keyof FeedbackData, value: unknown) => {
    setFeedback(prev => ({ ...prev, [field]: value }))
  }, [])

  // 재현 단계 추가
  const addStep = useCallback(() => {
    if (currentStep.trim()) {
      setFeedback(prev => ({
        ...prev,
        steps: [...(prev.steps || []), currentStep.trim()],
      }))
      setCurrentStep('')
    }
  }, [currentStep])

  // 재현 단계 삭제
  const removeStep = useCallback((index: number) => {
    setFeedback(prev => ({
      ...prev,
      steps: prev.steps?.filter((_, i) => i !== index),
    }))
  }, [])

  // 제출
  const handleSubmit = useCallback(async () => {
    if (!feedback.type || !feedback.title) return

    setIsSubmitting(true)
    try {
      const completeData: FeedbackData = {
        type: feedback.type,
        priority: feedback.priority || 'medium',
        title: feedback.title,
        description: feedback.description || '',
        expectedBehavior: feedback.expectedBehavior,
        actualBehavior: feedback.actualBehavior,
        steps: feedback.steps,
        context: feedback.context,
        createdAt: new Date(),
      }

      await onSubmit?.(completeData)
      // 성공 시 초기화
      setStep(1)
      setFeedback({
        type: undefined,
        priority: 'medium',
        title: '',
        description: '',
        context,
      })
    } catch (error) {
      console.error('피드백 제출 실패:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [feedback, context, onSubmit])

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg" data-testid="feedback-panel">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">피드백 보내기</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {step === 1 ? '어떤 종류의 피드백인가요?' : '자세한 내용을 알려주세요'}
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Step 1: 타입 선택 */}
      {step === 1 && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {FEEDBACK_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTypeSelect(type.value)}
                className="p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-xs text-gray-500 mt-1">{type.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: 상세 입력 */}
      {step === 2 && (
        <div className="p-4 space-y-4">
          {/* 선택된 타입 표시 */}
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <span className="text-xl">
              {FEEDBACK_TYPES.find(t => t.value === feedback.type)?.icon}
            </span>
            <span className="font-medium text-gray-700">
              {FEEDBACK_TYPES.find(t => t.value === feedback.type)?.label}
            </span>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-blue-600 hover:text-blue-800 ml-auto"
            >
              변경
            </button>
          </div>

          {/* 우선순위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              우선순위
            </label>
            <div className="flex gap-2">
              {PRIORITY_LEVELS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => updateField('priority', p.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    feedback.priority === p.value
                      ? p.color + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={feedback.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="한 줄로 요약해주세요"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              자세한 설명
            </label>
            <textarea
              value={feedback.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="문제 상황이나 제안 내용을 자유롭게 적어주세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 버그 타입일 때 추가 필드 */}
          {feedback.type === 'bug' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    예상한 동작
                  </label>
                  <textarea
                    value={feedback.expectedBehavior}
                    onChange={(e) => updateField('expectedBehavior', e.target.value)}
                    placeholder="어떻게 동작해야 하나요?"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    실제 동작
                  </label>
                  <textarea
                    value={feedback.actualBehavior}
                    onChange={(e) => updateField('actualBehavior', e.target.value)}
                    placeholder="실제로 어떻게 동작하나요?"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                </div>
              </div>

              {/* 재현 단계 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  재현 단계
                </label>
                <div className="space-y-2">
                  {feedback.steps?.map((s, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6">{index + 1}.</span>
                      <span className="flex-1 text-sm text-gray-700">{s}</span>
                      <button
                        onClick={() => removeStep(index)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentStep}
                      onChange={(e) => setCurrentStep(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addStep()}
                      placeholder="단계를 입력하고 Enter"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={addStep}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 컨텍스트 표시 */}
          {context && (
            <div className="p-2 bg-gray-50 rounded text-xs text-gray-500">
              📍 컨텍스트: {context}
            </div>
          )}
        </div>
      )}

      {/* 푸터 */}
      {step === 2 && (
        <div className="p-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => setStep(1)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← 이전
          </button>
          <button
            onClick={handleSubmit}
            disabled={!feedback.title || isSubmitting}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              feedback.title && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '제출 중...' : '피드백 보내기'}
          </button>
        </div>
      )}
    </div>
  )
}

export default FeedbackPanel
