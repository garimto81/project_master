/**
 * Repositories API
 * GET /api/repositories - 전체 레포지토리 목록 조회
 *
 * FastAPI backend/src/main.py의 get_repositories 함수를 마이그레이션
 * 페이지네이션으로 전체 레포 가져오기 (100개씩)
 *
 * 인증: 사용자별 GitHub 토큰 사용 (provider_token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  open_issues_count: number
  stargazers_count: number
  updated_at: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
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

    console.log(`[API] /api/repositories - 요청 사용자: ${user.login}`)

    // 페이지네이션으로 전체 레포 가져오기
    const allRepos: GitHubRepo[] = []
    let page = 1
    const perPage = 100

    while (true) {
      const response = await fetch(
        `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`GitHub API 오류: ${response.status}`)
      }

      const repos = await response.json() as GitHubRepo[]

      if (repos.length === 0) {
        break
      }

      allRepos.push(...repos)

      if (repos.length < perPage) {
        break
      }

      page++
    }

    // 응답 형식 변환 (FastAPI 응답과 호환)
    const repositories = allRepos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      open_issues_count: repo.open_issues_count,
      stargazers_count: repo.stargazers_count,
      updated_at: repo.updated_at,
    }))

    return NextResponse.json({
      repositories,
      total: repositories.length,
      // 현재 로그인한 GitHub 사용자 정보
      authenticated_user: {
        login: user.login,
        avatar_url: user.avatar_url,
      },
    })
  } catch (error) {
    console.error('Repositories API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch repositories' },
      { status: 500 }
    )
  }
}
