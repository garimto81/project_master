/**
 * Close Issue API
 * PATCH /api/issues/[number]/close - 이슈 닫기
 *
 * 인증: 사용자별 GitHub 토큰 사용 (provider_token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

interface Params {
  params: Promise<{
    number: string
  }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { number } = await params

    // 인증 확인 (사용자별 GitHub 토큰)
    const { token, user, error } = await getGitHubTokenFromSession()

    if (!token || !user) {
      return NextResponse.json(
        {
          error: error || 'GitHub 인증이 필요합니다',
          authenticated: false,
        },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const repo = searchParams.get('repo')

    if (!repo) {
      return NextResponse.json(
        { error: 'repo 파라미터가 필요합니다' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues/${number}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: 'closed' }),
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to close issue: #${number}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Close issue API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to close issue' },
      { status: 500 }
    )
  }
}
