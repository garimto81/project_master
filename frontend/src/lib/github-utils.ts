/**
 * GitHub API Utilities - 공통 GitHub API 헬퍼
 * 중복 코드 제거를 위한 공유 유틸리티
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

// ============================================================
// 타입 정의
// ============================================================

export interface GitHubTreeItem {
  path: string
  type: string
  sha?: string
  size?: number
}

export interface GitHubTreeResponse {
  tree: GitHubTreeItem[]
  truncated?: boolean
}

export interface AuthResult {
  token: string | null
  error?: NextResponse
}

// ============================================================
// 인증 헬퍼
// ============================================================

/**
 * GitHub 토큰 인증 확인
 * 인증 실패 시 적절한 에러 응답 반환
 */
export async function requireGitHubAuth(): Promise<AuthResult> {
  const { token } = await getGitHubTokenFromSession()

  if (!token) {
    return {
      token: null,
      error: NextResponse.json(
        { error: 'GitHub 인증이 필요합니다. 로그인해주세요.' },
        { status: 401 }
      ),
    }
  }

  return { token }
}

// ============================================================
// 요청 파싱 헬퍼
// ============================================================

/**
 * 안전한 JSON 요청 본문 파싱
 */
export async function parseJsonBody<T>(
  request: NextRequest
): Promise<{ data?: T; error?: NextResponse }> {
  try {
    const text = await request.text()
    if (!text || text.trim() === '') {
      return {
        error: NextResponse.json(
          { error: 'Request body is required' },
          { status: 400 }
        ),
      }
    }
    return { data: JSON.parse(text) as T }
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    }
  }
}

/**
 * repo 파라미터 검증
 */
export function validateRepo(repo: string | undefined): {
  owner?: string
  repoName?: string
  error?: NextResponse
} {
  if (!repo) {
    return {
      error: NextResponse.json(
        { error: 'repo parameter required' },
        { status: 400 }
      ),
    }
  }

  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) {
    return {
      error: NextResponse.json(
        { error: 'Invalid repo format. Expected: owner/repo' },
        { status: 400 }
      ),
    }
  }

  return { owner, repoName }
}

// ============================================================
// GitHub API 헬퍼
// ============================================================

/**
 * 레포지토리 트리 가져오기 (브랜치 자동 탐색)
 */
export async function fetchRepoTree(
  owner: string,
  repoName: string,
  branch: string,
  token: string
): Promise<GitHubTreeResponse> {
  const branches = branch === 'main' ? ['main', 'master'] : [branch]

  for (const b of branches) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/${b}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (response.ok) {
      return response.json()
    }
  }

  throw new Error(`Failed to fetch tree for ${owner}/${repoName}`)
}

/**
 * 코드 파일 필터링 (테스트, 설정 파일 제외)
 */
export function filterCodeFiles(
  tree: GitHubTreeItem[],
  options: {
    maxFiles?: number
    includePaths?: string[]
    excludePatterns?: string[]
  } = {}
): GitHubTreeItem[] {
  const {
    maxFiles = 50,
    includePaths = ['src/', 'pages/', 'app/'],
    excludePatterns = [
      '.test.',
      '.spec.',
      '__tests__',
      '.config.',
      '.d.ts',
      'node_modules',
    ],
  } = options

  return tree
    .filter((item) => {
      if (item.type !== 'blob') return false
      if (!item.path.match(/\.(tsx?|jsx?)$/)) return false

      // 제외 패턴 확인
      for (const pattern of excludePatterns) {
        if (item.path.includes(pattern)) return false
      }

      // 포함 경로 확인
      for (const path of includePaths) {
        if (item.path.startsWith(path)) return true
      }

      return false
    })
    .slice(0, maxFiles)
}

/**
 * 파일 내용 배치 가져오기
 */
export async function fetchFileContents(
  owner: string,
  repo: string,
  files: GitHubTreeItem[],
  token: string,
  batchSize: number = 5
): Promise<Array<{ path: string; content: string }>> {
  const results: Array<{ path: string; content: string }> = []

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            if (data.content) {
              const content = Buffer.from(data.content, 'base64').toString('utf-8')
              return { path: file.path, content }
            }
          }
        } catch {
          // 개별 파일 실패 무시
        }
        return null
      })
    )

    results.push(
      ...batchResults.filter((r): r is { path: string; content: string } => r !== null)
    )
  }

  return results
}

// ============================================================
// 이슈 관련 헬퍼
// ============================================================

/**
 * GitHub 이슈 상태 변경 (close/reopen)
 */
export async function updateIssueState(
  owner: string,
  repo: string,
  issueNumber: number,
  state: 'open' | 'closed',
  token: string
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      error: `GitHub API error: ${response.status} - ${errorText}`,
    }
  }

  const data = await response.json()
  return { success: true, data }
}

// ============================================================
// 에러 응답 헬퍼
// ============================================================

/**
 * 표준 에러 응답 생성
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: unknown
): NextResponse {
  const body: { error: string; details?: string } = { error: message }
  if (details) {
    body.details = String(details)
  }
  return NextResponse.json(body, { status })
}
