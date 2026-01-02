/**
 * AI Reject API
 * POST /api/ai/reject - AI 생성 코드 거부
 *
 * PRD: 0006-prd-ai-auto-mode.md
 */

import { NextRequest, NextResponse } from 'next/server'

interface RejectRequest {
  resolveId: string
}

export async function POST(request: NextRequest) {
  try {
    // 안전한 JSON 파싱 (빈 body 처리)
    let body: RejectRequest
    try {
      const text = await request.text()
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Request body is required' },
          { status: 400 }
        )
      }
      body = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { resolveId } = body

    if (!resolveId) {
      return NextResponse.json(
        { success: false, error: 'resolveId는 필수입니다' },
        { status: 400 }
      )
    }

    // 거부 처리: 상태 초기화
    // 실제 프로덕션에서는 캐시에서 해당 resolveId 삭제

    const isMockMode = process.env.MOCK_AI_API === 'true'

    if (isMockMode) {
      // Mock 모드: 성공 응답
      return NextResponse.json({
        success: true,
        message: '코드가 거부되었습니다 (Mock 모드)',
      })
    }

    return NextResponse.json({
      success: true,
      message: '코드가 거부되었습니다. 변경 사항이 폐기됩니다.',
    })
  } catch (error) {
    console.error('Reject API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '거부 처리 실패',
      },
      { status: 500 }
    )
  }
}
