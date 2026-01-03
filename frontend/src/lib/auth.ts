/**
 * Authentication Utilities
 * PRD v6.1: Supabase Auth + GitHub OAuth
 *
 * 사용자별 GitHub 토큰 관리
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 서버 사이드에서 Supabase 클라이언트 생성 (쿠키 기반)
 */
export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
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
    },
  })
}

/**
 * 현재 사용자의 GitHub 토큰 가져오기
 *
 * Supabase Auth 세션의 provider_token만 사용 (하드코딩 폴백 제거)
 *
 * v6.2 Fix: getSession() 대신 getUser()로 서버 검증
 * - getSession()은 쿠키에서만 읽어서 만료된 세션도 유효한 것처럼 보임
 * - getUser()는 Supabase 서버에서 토큰 유효성을 검증함
 * - GitHub Issue #39: 첫 접속 시 로그인 상태 불일치 (캐시 문제) 수정
 *
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

  if (supabase) {
    try {
      // Step 1: getUser()로 세션 유효성 검증 (서버에서 토큰 검증)
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

      if (userError || !authUser) {
        // 세션이 만료되었거나 유효하지 않음
        console.log('[Auth] Session invalid or expired:', userError?.message)
        return {
          token: null,
          user: null,
          error: 'GitHub 인증이 필요합니다. 로그인해주세요.',
        }
      }

      // Step 2: 검증된 세션에서 provider_token 가져오기
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.provider_token) {
        // 세션은 유효하지만 GitHub 토큰이 없음 (만료됨)
        console.log('[Auth] Session valid but no provider_token')
        return {
          token: null,
          user: null,
          error: 'GitHub 토큰이 만료되었습니다. 다시 로그인해주세요.',
        }
      }

      // Step 3: GitHub 토큰 유효성 검증
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${session.provider_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })

      if (!userResponse.ok) {
        // GitHub 토큰이 만료되었거나 유효하지 않음
        console.log('[Auth] GitHub token invalid:', userResponse.status)
        return {
          token: null,
          user: null,
          error: 'GitHub 토큰이 만료되었습니다. 다시 로그인해주세요.',
        }
      }

      const userData = await userResponse.json()
      return {
        token: session.provider_token,
        user: {
          id: authUser.id,
          email: authUser.email ?? null,
          login: userData.login,
          avatar_url: userData.avatar_url,
        },
        error: null,
      }
    } catch (e) {
      console.error('[Auth] Supabase session error:', e)
    }
  }

  // 인증 실패 - 로그인 필요
  return {
    token: null,
    user: null,
    error: 'GitHub 인증이 필요합니다. 로그인해주세요.',
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
