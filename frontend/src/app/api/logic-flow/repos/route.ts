/**
 * Logic Flow API - Repositories List (Level 0)
 * PRD v6.2 Section 1.2: 다층 시각화 시스템
 *
 * 사용자의 전체 레포지토리 목록 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

interface GitHubRepoResponse {
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  open_issues_count: number
  updated_at: string
  visibility?: string
  private: boolean
}

interface Repository {
  name: string
  full_name: string
  description: string | null
  language: string | null
  stars: number
  open_issues: number
  updated_at: string
  visibility: 'public' | 'private'
}

interface ReposResponse {
  level: 'user'
  owner: string
  repositories: Repository[]
  mermaid_code: string
  summary: {
    total_repos: number
    total_issues: number
    languages: string[]
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const owner = searchParams.get('owner')

  if (!owner) {
    return NextResponse.json({ error: 'owner parameter required' }, { status: 400 })
  }

  // 인증 확인
  const { token } = await getGitHubTokenFromSession()

  if (!token) {
    return NextResponse.json({ error: 'GitHub 인증이 필요합니다. 로그인해주세요.' }, { status: 401 })
  }

  try {
    // GitHub API로 레포지토리 목록 가져오기
    const reposResponse = await fetch(
      `https://api.github.com/users/${owner}/repos?sort=updated&per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!reposResponse.ok) {
      throw new Error('Failed to fetch repositories')
    }

    const reposData = await reposResponse.json()

    // 레포지토리 목록 변환
    const repositories: Repository[] = (reposData as GitHubRepoResponse[]).map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      open_issues: repo.open_issues_count,
      updated_at: repo.updated_at,
      visibility: (repo.visibility || (repo.private ? 'private' : 'public')) as 'public' | 'private',
    }))

    // 언어 목록 추출
    const languages = [...new Set(repositories.map(r => r.language).filter(Boolean))] as string[]

    // 전체 이슈 수
    const totalIssues = repositories.reduce((sum, r) => sum + r.open_issues, 0)

    // Mermaid 다이어그램 생성 (Block Diagram)
    const mermaidLines = ['block-beta', '  columns 3']

    for (const repo of repositories.slice(0, 12)) { // 최대 12개
      const safeName = repo.name.replace(/[^a-zA-Z0-9]/g, '_')
      const issueIcon = repo.open_issues > 0 ? `🔴${repo.open_issues}` : ''
      const starIcon = repo.stars > 0 ? `⭐${repo.stars}` : ''
      const label = `${repo.name}\\n${starIcon} ${issueIcon}`.trim()

      const style = repo.open_issues > 0 ? ':::hasIssues' : ''
      mermaidLines.push(`  ${safeName}["${label}"]${style}`)
    }

    mermaidLines.push('  classDef hasIssues fill:#fef2f2,stroke:#dc2626')

    const response: ReposResponse = {
      level: 'user',
      owner,
      repositories,
      mermaid_code: mermaidLines.join('\n'),
      summary: {
        total_repos: repositories.length,
        total_issues: totalIssues,
        languages,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Logic flow repos error:', error)
    return NextResponse.json({ error: '레포지토리 목록을 불러올 수 없습니다' }, { status: 500 })
  }
}
