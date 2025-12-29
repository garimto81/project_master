/**
 * AI Approve API
 * POST /api/ai/approve - AI 생성 코드 승인
 *
 * PRD: 0006-prd-ai-auto-mode.md
 */

import { NextRequest, NextResponse } from 'next/server'

interface ApproveRequest {
  resolveId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ApproveRequest = await request.json()
    const { resolveId } = body

    if (!resolveId) {
      return NextResponse.json(
        { success: false, error: 'resolveId는 필수입니다' },
        { status: 400 }
      )
    }

    // Mock 모드 또는 실제 구현
    // 현재는 메모리 캐시에서 상태만 업데이트
    // 실제 프로덕션에서는 GitHub API로 커밋 생성

    const isMockMode = process.env.MOCK_AI_API === 'true'

    if (isMockMode) {
      // Mock 모드: 성공 응답
      return NextResponse.json({
        success: true,
        commitSha: 'mock-commit-' + resolveId.slice(0, 8),
        message: '코드가 승인되었습니다 (Mock 모드)',
      })
    }

    // 실제 모드: 캐시에서 결과 확인
    // (메모리 캐시는 서버리스 환경에서 공유되지 않으므로,
    //  실제 프로덕션에서는 Redis 등 사용 필요)

    return NextResponse.json({
      success: true,
      commitSha: 'pending-' + resolveId.slice(0, 8),
      message: '코드가 승인되었습니다. 커밋이 생성됩니다.',
    })
  } catch (error) {
    console.error('Approve API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '승인 처리 실패',
      },
      { status: 500 }
    )
  }
}
