/**
 * Authentication Utilities - Server Side
 * PRD v6.1: Supabase Auth + GitHub OAuth
 *
 * 서버 사이드 인증 및 GitHub 토큰 관리
 */

import { type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  createSupabaseServerClient,
  validateGitHubToken,
  AUTH_ERRORS,
} from './auth-utils'

/**
 * 서버 사이드에서 Supabase 클라이언트 생성 (쿠키 기반)
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch {
        // 서버 컴포넌트에서 쿠키 설정 불가 시 무시
      }
    },
  })
}

/**
 * 현재 사용자의 GitHub 토큰 가져오기
 *
 * Supabase Auth 세션의 provider_token 사용
 *
 * 검증 순서:
 * 1. Supabase getUser()로 세션 유효성 검증 (서버에서 토큰 검증)
 * 2. getSession()으로 provider_token 확인
 * 3. GitHub API로 토큰 유효성 검증
 *
 * @see GitHub Issue #39: 첫 접속 시 로그인 상태 불일치 수정
 * @returns GitHub Access Token 또는 null
 */
export async function getGitHubTokenFromSession(): Promise<{
  token: string | null
  user: {
    id: string
    email: string | null
    login: string | null
    avatar_url: string | null
  } | null
  error: string | null
}> {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    console.error('[Auth] Supabase client not available')
    return {
      token: null,
      user: null,
      error: AUTH_ERRORS.NOT_CONFIGURED,
    }
  }

  try {
    // Step 1: getUser()로 세션 유효성 검증 (서버에서 토큰 검증)
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

    if (userError || !authUser) {
      console.log('[Auth] Session invalid or expired:', userError?.message)
      return {
        token: null,
        user: null,
        error: AUTH_ERRORS.SESSION_EXPIRED,
      }
    }

    // Step 2: 검증된 세션에서 provider_token 가져오기
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.provider_token) {
      console.log('[Auth] Session valid but no provider_token')
      return {
        token: null,
        user: null,
        error: AUTH_ERRORS.TOKEN_EXPIRED,
      }
    }

    // Step 3: GitHub 토큰 유효성 검증
    const githubValidation = await validateGitHubToken(session.provider_token)

    if (!githubValidation.valid || !githubValidation.user) {
      console.log('[Auth] GitHub token invalid:', githubValidation.error)
      return {
        token: null,
        user: null,
        error: AUTH_ERRORS.TOKEN_EXPIRED,
      }
    }

    return {
      token: session.provider_token,
      user: {
        id: authUser.id,
        email: authUser.email ?? null,
        login: githubValidation.user.login,
        avatar_url: githubValidation.user.avatar_url,
      },
      error: null,
    }
  } catch (e) {
    console.error('[Auth] Unexpected error:', e)
    return {
      token: null,
      user: null,
      error: AUTH_ERRORS.SESSION_EXPIRED,
    }
  }
}

/**
 * API 라우트에서 인증 확인
 * 인증되지 않은 요청은 401 반환
 */
export async function requireAuth(): Promise<{
  token: string
  user: {
    id: string
    email: string | null
    login: string | null
    avatar_url: string | null
  }
} | { error: string; status: 401 }> {
  const { token, user, error } = await getGitHubTokenFromSession()

  if (!token || !user) {
    return {
      error: error || '인증이 필요합니다',
      status: 401,
    }
  }

  return { token, user }
}
