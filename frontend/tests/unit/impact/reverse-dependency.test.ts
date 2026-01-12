/**
 * Reverse Dependency Unit Tests
 * PRD-0008 Section 10.2: 역방향 의존성 테스트
 *
 * TDD Red Phase: 테스트 먼저 작성
 */

import { describe, it, expect } from 'vitest'
import {
  findCallers,
  calculateRisk,
  buildReverseDependencyGraph,
} from '@/lib/impact/reverse-dependency'

describe('ReverseDependencyAnalyzer', () => {
  describe('findCallers', () => {
    const mockGraph = {
      'useAuth': ['LoginPage', 'SignupPage', 'ProfilePage'],
      'LoginPage': ['App'],
      'SignupPage': ['App'],
      'ProfilePage': ['App', 'SettingsPage'],
      'App': [],
      'SettingsPage': [],
    }

    it('함수를 호출하는 모든 파일을 찾아야 함', () => {
      const callers = findCallers(mockGraph, 'useAuth')

      expect(callers).toContain('LoginPage')
      expect(callers).toContain('SignupPage')
      expect(callers).toContain('ProfilePage')
    })

    it('깊이 제한을 적용해야 함', () => {
      const callers = findCallers(mockGraph, 'useAuth', { maxDepth: 1 })

      expect(callers).toContain('LoginPage')
      expect(callers).toContain('SignupPage')
      expect(callers).toContain('ProfilePage')
      expect(callers).not.toContain('App') // 깊이 2
    })

    it('순환 참조를 처리해야 함', () => {
      const cyclicGraph = {
        'A': ['B'],
        'B': ['C'],
        'C': ['A'], // 순환
      }

      const callers = findCallers(cyclicGraph, 'A')

      // 무한 루프 없이 완료되어야 함
      expect(callers).toBeDefined()
    })

    it('존재하지 않는 함수는 빈 배열 반환해야 함', () => {
      const callers = findCallers(mockGraph, 'nonexistent')

      expect(callers).toEqual([])
    })

    it('호출자가 없는 함수는 빈 배열 반환해야 함', () => {
      const callers = findCallers(mockGraph, 'App')

      expect(callers).toEqual([])
    })
  })

  describe('calculateRisk', () => {
    it('호출자가 많으면 높은 위험으로 판정해야 함', () => {
      const impact = { directCount: 10, indirectCount: 20 }

      const risk = calculateRisk(impact)

      expect(risk).toBe('high')
    })

    it('호출자가 적당하면 중간 위험으로 판정해야 함', () => {
      const impact = { directCount: 3, indirectCount: 5 }

      const risk = calculateRisk(impact)

      expect(risk).toBe('medium')
    })

    it('호출자가 적으면 낮은 위험으로 판정해야 함', () => {
      const impact = { directCount: 1, indirectCount: 0 }

      const risk = calculateRisk(impact)

      expect(risk).toBe('low')
    })

    it('호출자가 없으면 낮은 위험으로 판정해야 함', () => {
      const impact = { directCount: 0, indirectCount: 0 }

      const risk = calculateRisk(impact)

      expect(risk).toBe('low')
    })

    it('직접 호출자가 5개 이상이면 높은 위험', () => {
      const impact = { directCount: 5, indirectCount: 0 }

      const risk = calculateRisk(impact)

      expect(risk).toBe('high')
    })

    it('간접 호출자만 많아도 중간 이상 위험', () => {
      const impact = { directCount: 1, indirectCount: 10 }

      const risk = calculateRisk(impact)

      expect(['medium', 'high']).toContain(risk)
    })
  })

  describe('buildReverseDependencyGraph', () => {
    it('호출 관계를 역방향 그래프로 변환해야 함', () => {
      const forwardEdges = [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
      ]

      const reverseGraph = buildReverseDependencyGraph(forwardEdges)

      // B는 A에 의해 호출됨
      expect(reverseGraph['B']).toContain('A')
      // C는 A에 의해 호출됨
      expect(reverseGraph['C']).toContain('A')
      // D는 B에 의해 호출됨
      expect(reverseGraph['D']).toContain('B')
    })

    it('빈 엣지 배열은 빈 그래프 반환해야 함', () => {
      const reverseGraph = buildReverseDependencyGraph([])

      expect(Object.keys(reverseGraph).length).toBe(0)
    })

    it('중복 엣지는 하나로 처리해야 함', () => {
      const forwardEdges = [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'B' }, // 중복
        { from: 'A', to: 'B' }, // 중복
      ]

      const reverseGraph = buildReverseDependencyGraph(forwardEdges)

      // B의 호출자에 A가 한 번만 있어야 함
      const aCount = reverseGraph['B']?.filter(c => c === 'A').length || 0
      expect(aCount).toBe(1)
    })
  })
})
