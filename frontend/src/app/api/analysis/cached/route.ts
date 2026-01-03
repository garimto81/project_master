/**
 * Analysis Cached API - 캐시된 분석 결과 조회
 * PRD-0007: 코드 시각화 시스템 재설계 (MVP)
 *
 * 기능:
 * - Vercel KV에서 캐시 조회
 * - 캐시 히트/미스 응답
 * - 캐시 무효화 (새로고침)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import {
  getCachedAnalysis,
  deleteCachedAnalysis,
  type CachedAnalysis,
} from '@/lib/cache'

// ============================================================
// 타입 정의
// ============================================================

interface CachedResponse extends CachedAnalysis {
  cached: true
}

interface NotCachedResponse {
  cached: false
  error: 'not_cached'
  message: string
}

// ============================================================
// GET 핸들러
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { user } = await getGitHubTokenFromSession()
    if (!user) {
      return NextResponse.json(
        { error: 'GitHub 인증이 필요합니다. 로그인해주세요.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const repo = searchParams.get('repo')

    if (!repo) {
      return NextResponse.json(
        { error: 'repo 파라미터가 필요합니다' },
        { status: 400 }
      )
    }

    // 캐시 조회
    const cached = await getCachedAnalysis(user.id, repo)

    if (cached) {
      const response: CachedResponse = {
        ...cached,
        cached: true,
      }
      return NextResponse.json(response)
    }

    // 캐시 미스
    const response: NotCachedResponse = {
      cached: false,
      error: 'not_cached',
      message: `${repo} 분석 결과가 캐시되어 있지 않습니다.`,
    }

    return NextResponse.json(response, { status: 404 })
  } catch (error) {
    console.error('Cached analysis error:', error)
    return NextResponse.json(
      { error: '캐시를 조회할 수 없습니다', details: String(error) },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE 핸들러 (캐시 무효화)
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인
    const { user } = await getGitHubTokenFromSession()
    if (!user) {
      return NextResponse.json(
        { error: 'GitHub 인증이 필요합니다. 로그인해주세요.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const repo = searchParams.get('repo')

    if (!repo) {
      return NextResponse.json(
        { error: 'repo 파라미터가 필요합니다' },
        { status: 400 }
      )
    }

    // 캐시 삭제
    const success = await deleteCachedAnalysis(user.id, repo)

    if (success) {
      return NextResponse.json({
        success: true,
        message: `${repo} 캐시가 삭제되었습니다.`,
      })
    }

    return NextResponse.json({
      success: false,
      message: '캐시 삭제에 실패했습니다.',
    })
  } catch (error) {
    console.error('Cache delete error:', error)
    return NextResponse.json(
      { error: '캐시를 삭제할 수 없습니다', details: String(error) },
      { status: 500 }
    )
  }
}
