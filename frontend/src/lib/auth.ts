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
  // Supabase 세션에서 provider_token 확인
  const supabase = await createServerSupabaseClient()

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.provider_token) {
        // GitHub 사용자 정보 가져오기
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${session.provider_token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        })

        if (userResponse.ok) {
          const userData = await userResponse.json()
          return {
            token: session.provider_token,
            user: {
              id: session.user.id,
              email: session.user.email ?? null,
              login: userData.login,
              avatar_url: userData.avatar_url,
            },
            error: null,
          }
        }
      }
    } catch (e) {
      console.error('Supabase session error:', e)
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
