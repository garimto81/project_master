'use client'

/**
 * ProblemAnalyzer - 문제 분석 인터페이스
 * 비개발자가 문제를 단계별로 분석할 수 있도록 가이드
 */

import { useState, useMemo } from 'react'
import { AnalysisResult, RiskPoint } from '@/lib/types'

interface ProblemAnalyzerProps {
  analysisResult: AnalysisResult
  onProblemIdentified?: (problem: IdentifiedProblem) => void
  onRequestAIHelp?: (context: string) => void
}

export interface IdentifiedProblem {
  id: string
  type: 'circular' | 'risk' | 'missing' | 'performance' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  location?: string
  suggestion?: string
  relatedModules?: string[]
}

interface AnalysisStep {
  id: number
  title: string
  description: string
  questions: string[]
  completed: boolean
  answer?: string
}

export function ProblemAnalyzer({
  analysisResult,
  onProblemIdentified,
  onRequestAIHelp,
}: ProblemAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<'guided' | 'auto' | 'problems'>('guided')
  const [currentStep, setCurrentStep] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [identifiedProblems, setIdentifiedProblems] = useState<IdentifiedProblem[]>([])

  // 가이드 분석 단계
  const analysisSteps: AnalysisStep[] = [
    {
      id: 0,
      title: '문제 상황 파악',
      description: '어떤 상황에서 문제가 발생하나요?',
      questions: [
        '화면이 제대로 표시되지 않나요?',
        '버튼이나 링크가 동작하지 않나요?',
        '데이터가 올바르게 보이지 않나요?',
        '속도가 느리거나 멈추나요?',
      ],
      completed: !!userAnswers[0],
    },
    {
      id: 1,
      title: '발생 시점 확인',
      description: '문제가 언제 발생하나요?',
      questions: [
        '처음 페이지를 열 때부터인가요?',
        '특정 버튼을 클릭한 후인가요?',
        '데이터를 입력한 후인가요?',
        '시간이 지나면 발생하나요?',
      ],
      completed: !!userAnswers[1],
    },
    {
      id: 2,
      title: '재현 가능성',
      description: '문제가 항상 발생하나요?',
      questions: [
        '항상 같은 방식으로 발생하나요?',
        '가끔씩만 발생하나요?',
        '특정 조건에서만 발생하나요?',
        '다른 기기/브라우저에서도 발생하나요?',
      ],
      completed: !!userAnswers[2],
    },
    {
      id: 3,
      title: '영향 범위',
      description: '문제가 어디까지 영향을 미치나요?',
      questions: [
        '한 페이지에서만 발생하나요?',
        '여러 페이지에서 발생하나요?',
        '다른 기능에도 영향이 있나요?',
        '데이터가 손실되나요?',
      ],
      completed: !!userAnswers[3],
    },
  ]

  // 자동 감지된 문제들
  const autoDetectedProblems = useMemo((): IdentifiedProblem[] => {
    const problems: IdentifiedProblem[] = []

    // 순환 의존성 문제
    analysisResult.circularDependencies.forEach((cd, index) => {
      problems.push({
        id: `circular-${index}`,
        type: 'circular',
        severity: cd.severity === 'error' ? 'high' : 'medium',
        title: '순환 의존성 감지',
        description: `${cd.cycle.length}개의 모듈이 서로를 참조하고 있습니다. 이로 인해 코드 유지보수가 어려워질 수 있습니다.`,
        location: cd.cycle.join(' → '),
        suggestion: cd.suggestion || '순환 참조를 끊기 위해 공통 모듈을 추출하세요.',
        relatedModules: cd.cycle,
      })
    })

    // 고위험 지점
    analysisResult.riskPoints
      .filter(rp => rp.severity === 'high')
      .forEach((rp, index) => {
        problems.push({
          id: `risk-${index}`,
          type: 'risk',
          severity: 'high',
          title: getRiskTypeLabel(rp.type),
          description: rp.description || '에러 발생 가능성이 높은 코드입니다.',
          location: `${rp.path}${rp.line ? `:${rp.line}` : ''}`,
          suggestion: getRiskSuggestion(rp.type),
        })
      })

    // 성능 문제 감지 (모듈 수가 너무 많은 경우)
    const largeModules = analysisResult.layers
      .flatMap(l => l.modules)
      .filter(m => (m.functions?.length || 0) > 20)

    largeModules.forEach((m, index) => {
      problems.push({
        id: `perf-${index}`,
        type: 'performance',
        severity: 'medium',
        title: '대규모 모듈 감지',
        description: `${m.name}에 ${m.functions?.length}개의 함수가 있습니다. 분리를 고려하세요.`,
        location: m.path,
        suggestion: '관련 기능별로 모듈을 분리하면 유지보수가 쉬워집니다.',
      })
    })

    return problems
  }, [analysisResult])

  const handleAnswerSelect = (stepId: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [stepId]: answer }))
    if (stepId < analysisSteps.length - 1) {
      setCurrentStep(stepId + 1)
    }
  }

  const handleProblemSelect = (problem: IdentifiedProblem) => {
    setIdentifiedProblems(prev => {
      const exists = prev.some(p => p.id === problem.id)
      if (exists) {
        return prev.filter(p => p.id !== problem.id)
      }
      return [...prev, problem]
    })
    onProblemIdentified?.(problem)
  }

  const handleRequestHelp = () => {
    const context = [
      '## 사용자 분석 결과',
      ...Object.entries(userAnswers).map(([step, answer]) =>
        `- ${analysisSteps[parseInt(step)]?.title}: ${answer}`
      ),
      '',
      '## 선택된 문제',
      ...identifiedProblems.map(p => `- ${p.title}: ${p.description}`),
    ].join('\n')

    onRequestAIHelp?.(context)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm" data-testid="problem-analyzer">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">문제 분석</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          단계별로 문제를 파악하고 해결 방향을 찾아보세요
        </p>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'guided', label: '가이드 분석', icon: '🧭' },
          { id: 'auto', label: '자동 감지', icon: '🔍', badge: autoDetectedProblems.length },
          { id: 'problems', label: '선택한 문제', icon: '📋', badge: identifiedProblems.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-600">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="p-4">
        {/* 가이드 분석 탭 */}
        {activeTab === 'guided' && (
          <div className="space-y-4">
            {/* 진행 상태 */}
            <div className="flex items-center gap-2 mb-4">
              {analysisSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 h-2 rounded-full ${
                    step.completed
                      ? 'bg-green-500'
                      : index === currentStep
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* 현재 단계 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900">
                단계 {currentStep + 1}: {analysisSteps[currentStep].title}
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                {analysisSteps[currentStep].description}
              </p>
            </div>

            {/* 질문 옵션 */}
            <div className="space-y-2">
              {analysisSteps[currentStep].questions.map((q, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentStep, q)}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    userAnswers[currentStep] === q
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* 네비게이션 */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                ← 이전
              </button>
              <button
                onClick={() => setCurrentStep(Math.min(analysisSteps.length - 1, currentStep + 1))}
                disabled={currentStep === analysisSteps.length - 1}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* 자동 감지 탭 */}
        {activeTab === 'auto' && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {autoDetectedProblems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">✅</div>
                <div>자동 감지된 문제가 없습니다</div>
              </div>
            ) : (
              autoDetectedProblems.map((problem) => {
                const isSelected = identifiedProblems.some(p => p.id === problem.id)

                return (
                  <div
                    key={problem.id}
                    onClick={() => handleProblemSelect(problem)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            problem.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            problem.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            problem.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {problem.severity.toUpperCase()}
                          </span>
                          <h4 className="font-medium text-gray-900">{problem.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{problem.description}</p>
                        {problem.location && (
                          <p className="text-xs text-gray-400 mt-2 font-mono">
                            📍 {problem.location}
                          </p>
                        )}
                        {problem.suggestion && (
                          <p className="text-xs text-blue-600 mt-1">
                            💡 {problem.suggestion}
                          </p>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* 선택한 문제 탭 */}
        {activeTab === 'problems' && (
          <div className="space-y-4">
            {identifiedProblems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">📋</div>
                <div>선택한 문제가 없습니다</div>
                <div className="text-sm mt-1">자동 감지 탭에서 문제를 선택하세요</div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {identifiedProblems.map((problem) => (
                    <div
                      key={problem.id}
                      className="p-3 rounded-lg bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{problem.title}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {problem.type}
                        </span>
                      </div>
                      <button
                        onClick={() => handleProblemSelect(problem)}
                        className="text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleRequestHelp}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  🤖 AI에게 해결 방법 요청
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 헬퍼 함수들
function getRiskTypeLabel(type: RiskPoint['type']): string {
  switch (type) {
    case 'try-catch': return 'Try-Catch 누락'
    case 'null-check': return 'Null 체크 없음'
    case 'error-boundary': return 'Error Boundary 없음'
    case 'async-await': return 'Async 에러 처리 필요'
    case 'type-assertion': return '타입 단언 사용'
    default: return type
  }
}

function getRiskSuggestion(type: RiskPoint['type']): string {
  switch (type) {
    case 'try-catch': return '에러가 발생할 수 있는 코드를 try-catch로 감싸세요.'
    case 'null-check': return '값이 없을 수 있는 경우를 처리하세요.'
    case 'error-boundary': return 'React Error Boundary를 추가하세요.'
    case 'async-await': return 'async 함수의 에러를 처리하세요.'
    case 'type-assertion': return '타입 가드를 사용하여 안전하게 타입을 검사하세요.'
    default: return '코드를 검토하세요.'
  }
}

export default ProblemAnalyzer
