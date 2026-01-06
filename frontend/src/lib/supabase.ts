/**
 * Supabase Client for DevFlow - Browser Side
 * PRD v6.1: 2-tier 아키텍처 (Vercel + Supabase)
 *
 * 브라우저 클라이언트 - 쿠키 기반 세션 저장
 * 서버와 세션 공유를 위해 @supabase/ssr 사용
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured as _isSupabaseConfigured,
  GITHUB_OAUTH_SCOPES,
} from './auth-utils'

// Re-export for backward compatibility
export const isSupabaseConfigured = _isSupabaseConfigured

// Supabase 클라이언트 인스턴스 (쿠키 기반, 서버와 세션 공유)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

/**
 * GitHub OAuth 로그인
 * Supabase Auth가 GitHub 토큰을 자동으로 provider_token에 저장
 * @param returnTo 로그인 후 이동할 경로 (선택)
 */
export async function signInWithGitHub(returnTo?: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  // returnTo가 있으면 콜백 URL에 포함
  const callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`
    : undefined

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: GITHUB_OAUTH_SCOPES,
      redirectTo: callbackUrl
    }
  })
  return { data, error }
}

/**
 * 로그아웃
 */
export async function signOut() {
  if (!supabase) {
    return { error: null }
  }
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * 현재 세션 조회
 * 주의: getSession()은 쿠키에서만 읽어서 만료된 세션도 반환할 수 있음
 * 세션 유효성 검증이 필요하면 validateSession() 사용
 */
export async function getSession() {
  if (!supabase) {
    return null
  }
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * 현재 사용자 조회 (서버에서 토큰 검증)
 */
export async function getUser() {
  if (!supabase) {
    return null
  }
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * 세션 유효성 검증 (GitHub Issue #39 수정)
 *
 * getSession()은 쿠키에서만 읽어서 만료된 세션도 유효한 것처럼 보임
 * 이 함수는 서버에서 토큰을 검증하고, 무효한 세션이면 자동 로그아웃
 *
 * @returns { valid: boolean, user: User | null, shouldLogout: boolean }
 */
export async function validateSession(): Promise<{
  valid: boolean
  user: { id: string; email: string | null } | null
  shouldLogout: boolean
}> {
  if (!supabase) {
    return { valid: false, user: null, shouldLogout: false }
  }

  try {
    // Step 1: 쿠키에서 세션 확인 (빠른 체크)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      // 세션 없음 - 로그아웃 상태
      return { valid: false, user: null, shouldLogout: false }
    }

    // Step 2: 서버에서 사용자 검증 (토큰 유효성 확인)
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      // 세션이 쿠키에 있지만 유효하지 않음 - 자동 로그아웃 필요
      console.log('[Supabase] Session cookie exists but invalid:', error?.message)
      return { valid: false, user: null, shouldLogout: true }
    }

    // Step 3: provider_token 확인 (GitHub 토큰)
    if (!session.provider_token) {
      // Supabase 세션은 유효하지만 GitHub 토큰이 없음
      console.log('[Supabase] No provider_token - GitHub token expired')
      return { valid: false, user: null, shouldLogout: true }
    }

    return {
      valid: true,
      user: { id: user.id, email: user.email ?? null },
      shouldLogout: false,
    }
  } catch (e) {
    console.error('[Supabase] validateSession error:', e)
    return { valid: false, user: null, shouldLogout: false }
  }
}

/**
 * 세션 검증 후 필요시 자동 로그아웃
 * 컴포넌트에서 useEffect로 호출
 */
export async function checkAndHandleSession(): Promise<boolean> {
  const { valid, shouldLogout } = await validateSession()

  if (shouldLogout) {
    console.log('[Supabase] Auto logout due to invalid session')
    await signOut()
    return false
  }

  return valid
}

/**
 * GitHub Access Token 가져오기
 * Supabase Auth가 OAuth 과정에서 자동으로 저장한 provider_token 반환
 */
export async function getGitHubToken(): Promise<string | null> {
  const session = await getSession()
  return session?.provider_token ?? null
}

/**
 * 인증 상태 변경 리스너
 */
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  if (!supabase) {
    // 더미 구독 객체 반환 (테스트/개발 환경용)
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * GitHub API 호출 헬퍼 (인증된 요청)
 */
export async function fetchGitHubAPI(endpoint: string, options?: RequestInit) {
  const token = await getGitHubToken()

  if (!token) {
    throw new Error('GitHub 토큰이 없습니다. 로그인이 필요합니다.')
  }

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API 오류: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
