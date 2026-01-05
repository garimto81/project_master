/**
 * OAuth Callback Route Handler
 * Supabase PKCE 흐름: code → session 교환
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const returnTo = requestUrl.searchParams.get('returnTo') || '/'
  const origin = requestUrl.origin

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(`${origin}/?error=supabase_not_configured`)
    }

    const cookieStore = await cookies()

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
            // Server Component에서는 무시
          }
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth code exchange error:', error.message, error)
      // 에러 유형에 따른 상세 에러 코드
      const errorCode = error.message?.includes('expired')
        ? 'code_expired'
        : error.message?.includes('invalid')
          ? 'invalid_code'
          : 'auth_failed'
      return NextResponse.redirect(`${origin}/?error=${errorCode}`)
    }

    // 성공 시 returnTo 또는 홈으로 리다이렉트
    return NextResponse.redirect(`${origin}${returnTo}`)
  }

  // code가 없으면 홈으로
  return NextResponse.redirect(`${origin}/`)
}
