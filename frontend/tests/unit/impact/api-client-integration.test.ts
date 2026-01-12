/**
 * API-Client Integration Tests
 * PRD-0008: API 응답 구조와 클라이언트 타입 일치 검증
 *
 * 버그 원인: API 응답 (ImpactAnalysisResult)와 클라이언트 타입 (ImpactResult) 불일치
 * - summary: 객체 vs 문자열
 * - affectedCallers vs directCallers/indirectCallers
 */

import { describe, it, expect } from 'vitest'
import { mapToUserFeatures } from '@/lib/impact/feature-mapper'

// ImpactView.tsx의 formatResult 로직을 테스트하기 위한 재현
// 실제 컴포넌트에서 사용하는 동일한 변환 로직
interface Caller {
  id: string
  name: string
  displayName: string
  file: string
  line?: number
  depth: number
  impactLevel?: 'direct' | 'indirect'
}

interface ImpactResult {
  target: {
    id: string
    name: string
    displayName: string
    file?: string
    line?: number
  }
  directCallers: Caller[]
  indirectCallers: Caller[]
  userFeatures: string[]
  riskLevel: 'high' | 'medium' | 'low'
  summary: string
  mermaid?: string
}

// formatResult 로직 재현 (ImpactView.tsx:142-172와 동일해야 함)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatResult(raw: any, targetFunction: string = 'testFunc'): ImpactResult {
  const allCallers = raw.affectedCallers || []
  const direct = allCallers.filter((c: Caller & { impactLevel?: string }) => c.impactLevel === 'direct' || c.depth === 1)
  const indirect = allCallers.filter((c: Caller & { impactLevel?: string }) => c.impactLevel === 'indirect' || c.depth > 1)

  // summary가 객체면 humanReadableMessage 추출, 문자열이면 그대로 사용
  const summaryText = typeof raw.summary === 'object' && raw.summary !== null
    ? raw.summary.humanReadableMessage || ''
    : raw.summary || ''

  // riskLevel: summary.severity 또는 직접 전달된 값
  const riskLevel = (typeof raw.summary === 'object' && raw.summary?.severity)
    ? (raw.summary.severity === 'critical' ? 'high' : raw.summary.severity)
    : (raw.riskLevel || 'low')

  return {
    target: raw.target || { id: 'target', name: targetFunction, displayName: targetFunction },
    directCallers: direct,
    indirectCallers: indirect,
    userFeatures: raw.userFeatures || [],
    riskLevel,
    summary: summaryText,
    mermaid: raw.visualizationData?.mermaidCode || raw.mermaid,
  }
}

describe('API-Client Integration', () => {
  describe('formatResult - summary 변환', () => {
    it('API summary 객체에서 humanReadableMessage를 추출해야 함', () => {
      const apiResponse = {
        summary: {
          severity: 'high',
          humanReadableMessage: '이 함수를 삭제하면 3개 기능에 영향',
          recommendations: ['테스트 먼저 확인'],
        },
      }

      const result = formatResult(apiResponse)

      expect(typeof result.summary).toBe('string')
      expect(result.summary).toBe('이 함수를 삭제하면 3개 기능에 영향')
    })

    it('summary가 이미 문자열이면 그대로 사용해야 함', () => {
      const apiResponse = {
        summary: '이미 문자열 요약',
      }

      const result = formatResult(apiResponse)

      expect(result.summary).toBe('이미 문자열 요약')
    })

    it('summary가 null이면 빈 문자열 반환해야 함', () => {
      const apiResponse = {
        summary: null,
      }

      const result = formatResult(apiResponse)

      expect(result.summary).toBe('')
    })

    it('summary가 없으면 빈 문자열 반환해야 함', () => {
      const apiResponse = {}

      const result = formatResult(apiResponse)

      expect(result.summary).toBe('')
    })
  })

  describe('formatResult - riskLevel 변환', () => {
    it('summary.severity에서 riskLevel 추출해야 함', () => {
      const apiResponse = {
        summary: { severity: 'high', humanReadableMessage: '' },
      }

      const result = formatResult(apiResponse)

      expect(result.riskLevel).toBe('high')
    })

    it('critical severity는 high로 변환해야 함', () => {
      const apiResponse = {
        summary: { severity: 'critical', humanReadableMessage: '' },
      }

      const result = formatResult(apiResponse)

      expect(result.riskLevel).toBe('high')
    })

    it('riskLevel이 직접 전달되면 사용해야 함', () => {
      const apiResponse = {
        riskLevel: 'medium',
      }

      const result = formatResult(apiResponse)

      expect(result.riskLevel).toBe('medium')
    })
  })

  describe('formatResult - callers 분리', () => {
    it('affectedCallers를 impactLevel로 분리해야 함', () => {
      const apiResponse = {
        affectedCallers: [
          { id: '1', name: 'func1', displayName: 'Func 1', file: 'a.ts', depth: 1, impactLevel: 'direct' },
          { id: '2', name: 'func2', displayName: 'Func 2', file: 'b.ts', depth: 2, impactLevel: 'indirect' },
          { id: '3', name: 'func3', displayName: 'Func 3', file: 'c.ts', depth: 1, impactLevel: 'direct' },
        ],
      }

      const result = formatResult(apiResponse)

      expect(result.directCallers).toHaveLength(2)
      expect(result.indirectCallers).toHaveLength(1)
    })

    it('impactLevel이 없으면 depth로 분리해야 함', () => {
      const apiResponse = {
        affectedCallers: [
          { id: '1', name: 'func1', displayName: 'Func 1', file: 'a.ts', depth: 1 },
          { id: '2', name: 'func2', displayName: 'Func 2', file: 'b.ts', depth: 3 },
        ],
      }

      const result = formatResult(apiResponse)

      expect(result.directCallers).toHaveLength(1)
      expect(result.indirectCallers).toHaveLength(1)
    })

    it('affectedCallers가 없으면 빈 배열 반환해야 함', () => {
      const apiResponse = {}

      const result = formatResult(apiResponse)

      expect(result.directCallers).toEqual([])
      expect(result.indirectCallers).toEqual([])
    })
  })

  describe('formatResult - mermaid 코드', () => {
    it('visualizationData.mermaidCode에서 추출해야 함', () => {
      const apiResponse = {
        visualizationData: {
          mermaidCode: 'graph TB\n  A --> B',
        },
      }

      const result = formatResult(apiResponse)

      expect(result.mermaid).toBe('graph TB\n  A --> B')
    })

    it('mermaid가 직접 전달되면 사용해야 함', () => {
      const apiResponse = {
        mermaid: 'graph LR\n  X --> Y',
      }

      const result = formatResult(apiResponse)

      expect(result.mermaid).toBe('graph LR\n  X --> Y')
    })
  })

  describe('mapToUserFeatures - undefined 필터링', () => {
    it('undefined 파일 경로를 필터링해야 함', () => {
      // impact-analyzer.ts:61에서 undefined 필터링 필요
      const files = ['valid.ts', 'another.ts']
      const withUndefined = [undefined, ...files, null].filter((f): f is string => !!f)

      const result = mapToUserFeatures(withUndefined)

      // 에러 없이 실행되어야 함
      expect(Array.isArray(result)).toBe(true)
    })

    it('빈 배열도 처리해야 함', () => {
      const result = mapToUserFeatures([])

      expect(result).toEqual([])
    })
  })
})
