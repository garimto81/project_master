/**
 * Feature Mapper Unit Tests
 * PRD-0008 Section 10.2: 기능 매핑 테스트
 *
 * TDD Red Phase: 테스트 먼저 작성
 */

import { describe, it, expect } from 'vitest'
import {
  mapToUserFeatures,
  mapFileToFeatures,
  FEATURE_PATTERNS,
} from '@/lib/impact/feature-mapper'

describe('FeatureMapper', () => {
  describe('mapToUserFeatures', () => {
    it('파일을 사용자 기능으로 매핑해야 함', () => {
      const files = ['LoginPage.tsx', 'useAuth.ts', 'api/auth/route.ts']

      const features = mapToUserFeatures(files)

      expect(features).toContain('로그인')
    })

    it('여러 기능에 영향을 주는 경우 모두 반환해야 함', () => {
      const files = ['useAuth.ts'] // 인증 관련 여러 기능에 영향

      const features = mapToUserFeatures(files)

      expect(features).toContain('로그인')
      expect(features).toContain('회원가입')
      expect(features).toContain('프로필')
    })

    it('중복 기능은 제거해야 함', () => {
      const files = ['LoginPage.tsx', 'LoginForm.tsx', 'useLogin.ts']

      const features = mapToUserFeatures(files)

      // '로그인'이 여러 번 나오면 안됨
      const loginCount = features.filter(f => f === '로그인').length
      expect(loginCount).toBe(1)
    })

    it('매핑되지 않는 파일은 무시해야 함', () => {
      const files = ['utils.ts', 'constants.ts', 'helpers.ts']

      const features = mapToUserFeatures(files)

      expect(features.length).toBe(0)
    })

    it('빈 배열 입력 시 빈 배열 반환해야 함', () => {
      const features = mapToUserFeatures([])

      expect(features).toEqual([])
    })
  })

  describe('mapFileToFeatures', () => {
    it('LoginPage.tsx → ["로그인"] 매핑해야 함', () => {
      const features = mapFileToFeatures('src/pages/LoginPage.tsx')

      expect(features).toContain('로그인')
    })

    it('SignupPage.tsx → ["회원가입"] 매핑해야 함', () => {
      const features = mapFileToFeatures('src/pages/SignupPage.tsx')

      expect(features).toContain('회원가입')
    })

    it('ProfilePage.tsx → ["프로필"] 매핑해야 함', () => {
      const features = mapFileToFeatures('src/pages/ProfilePage.tsx')

      expect(features).toContain('프로필')
    })

    it('useAuth.ts → ["로그인", "회원가입", "프로필"] 매핑해야 함', () => {
      const features = mapFileToFeatures('src/hooks/useAuth.ts')

      expect(features).toContain('로그인')
      expect(features).toContain('회원가입')
      expect(features).toContain('프로필')
    })

    it('api/auth/route.ts → ["인증"] 매핑해야 함', () => {
      const features = mapFileToFeatures('src/app/api/auth/route.ts')

      expect(features).toContain('인증')
    })

    it('Dashboard.tsx → ["대시보드"] 매핑해야 함', () => {
      const features = mapFileToFeatures('src/pages/Dashboard.tsx')

      expect(features).toContain('대시보드')
    })

    it('SettingsPage.tsx → ["설정"] 매핑해야 함', () => {
      const features = mapFileToFeatures('src/pages/SettingsPage.tsx')

      expect(features).toContain('설정')
    })

    it('MermaidDiagram.tsx → ["코드 시각화"] 매핑해야 함', () => {
      const features = mapFileToFeatures('src/components/MermaidDiagram.tsx')

      expect(features).toContain('코드 시각화')
    })

    it('IssueList.tsx → ["이슈 관리"] 매핑해야 함', () => {
      const features = mapFileToFeatures('src/components/IssueList.tsx')

      expect(features).toContain('이슈 관리')
    })

    it('매핑되지 않는 파일은 빈 배열 반환해야 함', () => {
      const features = mapFileToFeatures('src/lib/utils.ts')

      expect(features).toEqual([])
    })
  })

  describe('FEATURE_PATTERNS', () => {
    it('최소 5개 이상의 기능 패턴이 정의되어야 함', () => {
      expect(Object.keys(FEATURE_PATTERNS).length).toBeGreaterThanOrEqual(5)
    })

    it('로그인 패턴이 정의되어야 함', () => {
      expect(FEATURE_PATTERNS['로그인']).toBeDefined()
    })

    it('회원가입 패턴이 정의되어야 함', () => {
      expect(FEATURE_PATTERNS['회원가입']).toBeDefined()
    })

    it('프로필 패턴이 정의되어야 함', () => {
      expect(FEATURE_PATTERNS['프로필']).toBeDefined()
    })
  })
})
