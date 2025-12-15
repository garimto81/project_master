/**
 * Repository Detail API
 * GET /api/repositories/[owner]/[repo] - 레포지토리 상세 조회
 *
 * FastAPI backend/src/main.py의 get_repository_detail 함수를 마이그레이션
 * README, 언어 통계, 최근 커밋, 브랜치, 컨트리뷰터 수 포함
 *
 * 인증: 사용자별 GitHub 토큰 사용 (provider_token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

interface Params {
  params: Promise<{
    owner: string
    repo: string
  }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params

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

    console.log(`[API] /api/repositories/${owner}/${repo} - 요청 사용자: ${user.login}`)

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    }

    // 병렬로 여러 API 호출
    const [repoResponse, readmeResponse, languagesResponse, commitsResponse, branchesResponse, contributorsResponse] =
      await Promise.all([
        // 기본 레포 정보
        fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
        // README
        fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }).catch(() => null),
        // 언어 통계
        fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers }),
        // 최근 커밋 (5개)
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, { headers }),
        // 브랜치 목록
        fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=10`, { headers }),
        // 컨트리뷰터 수
        fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=true`, { headers }),
      ])

    if (!repoResponse.ok) {
      return NextResponse.json(
        { error: `Repository not found: ${owner}/${repo}` },
        { status: 404 }
      )
    }

    const repoData = await repoResponse.json()
    const languages = languagesResponse.ok ? await languagesResponse.json() : {}
    const commits = commitsResponse.ok ? await commitsResponse.json() : []
    const branches = branchesResponse.ok ? await branchesResponse.json() : []

    // README 내용 파싱 (base64 디코딩)
    let readmeContent: string | null = null
    if (readmeResponse && readmeResponse.ok) {
      const readmeData = await readmeResponse.json()
      if (readmeData.content) {
        readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8')
      }
    }

    // 컨트리뷰터 수 (Link 헤더에서 파싱 또는 카운트)
    let contributorsCount = 0
    if (contributorsResponse.ok) {
      const linkHeader = contributorsResponse.headers.get('link')
      if (linkHeader) {
        // Link 헤더에서 마지막 페이지 번호 추출
        const match = linkHeader.match(/page=(\d+)>; rel="last"/)
        contributorsCount = match ? parseInt(match[1], 10) : 1
      } else {
        const contributors = await contributorsResponse.json()
        contributorsCount = Array.isArray(contributors) ? contributors.length : 0
      }
    }

    // 응답 형식 (FastAPI 응답과 호환)
    const detail = {
      id: repoData.id,
      name: repoData.name,
      full_name: repoData.full_name,
      description: repoData.description,
      language: repoData.language,
      open_issues_count: repoData.open_issues_count,
      stargazers_count: repoData.stargazers_count,
      forks_count: repoData.forks_count,
      watchers_count: repoData.watchers_count,
      size: repoData.size,
      default_branch: repoData.default_branch,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at,
      pushed_at: repoData.pushed_at,
      html_url: repoData.html_url,
      clone_url: repoData.clone_url,
      topics: repoData.topics || [],
      has_issues: repoData.has_issues,
      has_wiki: repoData.has_wiki,
      has_discussions: repoData.has_discussions,
      archived: repoData.archived,
      visibility: repoData.visibility,
      readme_content: readmeContent,
      languages,
      recent_commits: commits.map((commit: any) => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0],
        author: commit.commit.author?.name || 'Unknown',
        date: commit.commit.author?.date || '',
      })),
      branches: branches.map((branch: any) => branch.name),
      contributors_count: contributorsCount,
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error('Repository detail API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch repository detail' },
      { status: 500 }
    )
  }
}
