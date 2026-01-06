/**
 * Authentication Utilities - Shared helpers
 * PRD v6.1: Supabase Auth + GitHub OAuth
 *
 * 서버/클라이언트 공통 인증 유틸리티
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Supabase 환경변수
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Supabase 설정 여부 확인
export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

// GitHub OAuth scopes
export const GITHUB_OAUTH_SCOPES = 'read:user user:email repo'

/**
 * 쿠키 옵션 타입
 */
export interface CookieHandler {
  getAll: () => { name: string; value: string }[]
  setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => void
}

/**
 * 서버 사이드 Supabase 클라이언트 생성
 */
export function createSupabaseServerClient(cookieHandler: CookieHandler) {
  if (!isSupabaseConfigured) {
    return null
  }

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: cookieHandler,
  })
}

/**
 * GitHub 토큰 유효성 검증
 */
export async function validateGitHubToken(token: string): Promise<{
  valid: boolean
  user: {
    login: string
    avatar_url: string
  } | null
  error: string | null
}> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      return {
        valid: false,
        user: null,
        error: `GitHub API error: ${response.status}`,
      }
    }

    const userData = await response.json()
    return {
      valid: true,
      user: {
        login: userData.login,
        avatar_url: userData.avatar_url,
      },
      error: null,
    }
  } catch (e) {
    return {
      valid: false,
      user: null,
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

/**
 * 인증 에러 메시지
 */
export const AUTH_ERRORS = {
  NOT_CONFIGURED: 'Supabase가 설정되지 않았습니다.',
  SESSION_EXPIRED: 'GitHub 인증이 필요합니다. 로그인해주세요.',
  TOKEN_EXPIRED: 'GitHub 토큰이 만료되었습니다. 다시 로그인해주세요.',
  INVALID_TOKEN: 'GitHub 토큰이 유효하지 않습니다.',
} as const
