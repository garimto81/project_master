/**
 * Issue Detail API
 * GET /api/issues/[number] - 이슈 상세 조회
 *
 * FastAPI backend/src/main.py의 get_issue_detail 함수를 마이그레이션
 *
 * 인증: 사용자별 GitHub 토큰 사용 (provider_token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

interface GitHubIssue {
  id: number
  number: number
  title: string
  state: string
  labels: Array<{ name: string }>
  body: string | null
}

interface Params {
  params: Promise<{
    number: string
  }>
}

export async function GET(request: NextRequest, { params }: Params) {
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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `Issue not found: #${number}` },
        { status: response.status }
      )
    }

    const issue = await response.json() as GitHubIssue

    return NextResponse.json({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map((label) => label.name),
      body: issue.body,
    })
  } catch (error) {
    console.error('Issue detail API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch issue' },
      { status: 500 }
    )
  }
}
