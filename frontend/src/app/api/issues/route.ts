/**
 * Issues API
 * GET /api/issues - 이슈 목록 조회
 *
 * FastAPI backend/src/main.py의 get_issues 함수를 마이그레이션
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
  pull_request?: unknown
}

export async function GET(request: NextRequest) {
  try {
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
    const state = searchParams.get('state') || 'open'

    if (!repo) {
      return NextResponse.json(
        { error: 'repo 파라미터가 필요합니다' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=${state}&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub API 오류: ${response.status}` },
        { status: response.status }
      )
    }

    const issuesData = await response.json() as GitHubIssue[]

    // PR 제외하고 이슈만 필터링
    const issues = issuesData
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map((label) => label.name),
        body: issue.body,
      }))

    return NextResponse.json({
      issues,
      total: issues.length,
      repo,
    })
  } catch (error) {
    console.error('Issues API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch issues' },
      { status: 500 }
    )
  }
}
