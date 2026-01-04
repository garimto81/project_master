/**
 * Close Issue API
 * PATCH /api/issues/[number]/close - 이슈 닫기
 *
 * 인증: 사용자별 GitHub 토큰 사용 (provider_token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireGitHubAuth, updateIssueState, errorResponse } from '@/lib/github-utils'

interface Params {
  params: Promise<{
    number: string
  }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { number } = await params
    const issueNumber = parseInt(number, 10)

    // 인증 확인
    const auth = await requireGitHubAuth()
    if (auth.error) return auth.error

    const repo = request.nextUrl.searchParams.get('repo')
    if (!repo) {
      return errorResponse('repo 파라미터가 필요합니다', 400)
    }

    const [owner, repoName] = repo.split('/')
    const result = await updateIssueState(owner, repoName, issueNumber, 'closed', auth.token!)

    if (!result.success) {
      return errorResponse(result.error || `Failed to close issue: #${number}`, 400)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Close issue API error:', error)
    return errorResponse('Failed to close issue', 500, error)
  }
}
