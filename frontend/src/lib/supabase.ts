/**
 * Supabase Client for DevFlow
 * PRD v6.1: 2-tier 아키텍처 (Vercel + Supabase)
 *
 * 브라우저 클라이언트 - 쿠키 기반 세션 저장
 * 서버와 세션 공유를 위해 @supabase/ssr 사용
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Supabase URL과 익명 키 (환경변수에서 로드)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Supabase 설정 여부 확인 (테스트/개발 환경용)
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Supabase 클라이언트 인스턴스 (쿠키 기반, 서버와 세션 공유)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
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
      scopes: 'read:user user:email repo',
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
 */
export async function getSession() {
  if (!supabase) {
    return null
  }
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * 현재 사용자 조회
 */
export async function getUser() {
  if (!supabase) {
    return null
  }
  const { data: { user } } = await supabase.auth.getUser()
  return user
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
