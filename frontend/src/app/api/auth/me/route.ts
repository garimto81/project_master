/**
 * Current User API
 * GET /api/auth/me - 현재 로그인한 사용자 정보
 *
 * 응답:
 * - 로그인됨: { authenticated: true, user: { login, email, avatar_url } }
 * - 비로그인: { authenticated: false, user: null }
 */

import { NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

export async function GET() {
  const { token, user, error } = await getGitHubTokenFromSession()

  if (!token || !user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      message: error || '로그인이 필요합니다',
    })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      login: user.login,
      email: user.email,
      avatar_url: user.avatar_url,
    },
  })
}
