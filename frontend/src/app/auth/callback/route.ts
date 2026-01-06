/**
 * OAuth Callback Route Handler
 * Supabase PKCE 흐름: code → session 교환
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * 에러 코드:
 * - supabase_not_configured: Supabase 환경변수 누락
 * - code_missing: OAuth code 파라미터 누락
 * - code_expired: PKCE 코드 만료 (10분 제한)
 * - invalid_code: 코드 재사용 또는 잘못된 코드
 * - pkce_error: code_verifier 쿠키 누락
 * - auth_failed: 기타 인증 오류
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

// 에러 코드 매핑
type OAuthErrorCode =
  | 'supabase_not_configured'
  | 'code_missing'
  | 'code_expired'
  | 'invalid_code'
  | 'pkce_error'
  | 'auth_failed'

function getErrorCode(errorMessage: string | undefined): OAuthErrorCode {
  if (!errorMessage) return 'auth_failed'

  const msg = errorMessage.toLowerCase()

  // PKCE code_verifier 관련 에러
  if (msg.includes('code verifier') || msg.includes('code_verifier') || msg.includes('pkce')) {
    return 'pkce_error'
  }
  // 코드 만료
  if (msg.includes('expired')) {
    return 'code_expired'
  }
  // 잘못된 코드 (재사용 포함)
  if (msg.includes('invalid') || msg.includes('already used') || msg.includes('not found')) {
    return 'invalid_code'
  }

  return 'auth_failed'
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const returnTo = requestUrl.searchParams.get('returnTo') || '/'
  const origin = requestUrl.origin

  // OAuth 제공자(GitHub)에서 에러 반환
  if (errorParam) {
    console.error('[OAuth Callback] Provider error:', errorParam, errorDescription)
    return NextResponse.redirect(`${origin}/?error=auth_failed&detail=${encodeURIComponent(errorDescription || errorParam)}`)
  }

  // code 파라미터 없음
  if (!code) {
    console.error('[OAuth Callback] Missing code parameter')
    return NextResponse.redirect(`${origin}/?error=code_missing`)
  }

  // Supabase 환경변수 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[OAuth Callback] Supabase not configured')
    return NextResponse.redirect(`${origin}/?error=supabase_not_configured`)
  }

  const cookieStore = await cookies()

  // PKCE code_verifier 쿠키 확인 (디버깅용 로그)
  const allCookies = cookieStore.getAll()
  const pkceRelatedCookies = allCookies.filter(c =>
    c.name.includes('code_verifier') || c.name.includes('auth-token')
  )
  console.log('[OAuth Callback] PKCE cookies present:', pkceRelatedCookies.length > 0)

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // Server Component에서는 쿠키 설정 불가 - 무시
        }
      },
    },
  })

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const errorCode = getErrorCode(error.message)
      console.error('[OAuth Callback] Code exchange failed:', {
        code: errorCode,
        message: error.message,
        status: error.status,
      })
      return NextResponse.redirect(`${origin}/?error=${errorCode}`)
    }

    // 성공 - 세션 확인
    if (data.session) {
      console.log('[OAuth Callback] Session created successfully:', {
        userId: data.session.user.id,
        hasProviderToken: !!data.session.provider_token,
      })
    }

    // returnTo로 리다이렉트
    return NextResponse.redirect(`${origin}${returnTo}`)
  } catch (e) {
    // 예상치 못한 에러
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    console.error('[OAuth Callback] Unexpected error:', errorMessage)
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }
}
