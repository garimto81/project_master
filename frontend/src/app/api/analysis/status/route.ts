/**
 * Analysis Status API - 분석 상태 조회
 * PRD-0007: 코드 시각화 시스템 재설계 (MVP)
 *
 * 기능:
 * - 분석 진행 상태 조회
 * - 진행률 추적
 * - 폴링 지원
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import {
  getAnalysisStatus,
  getCachedAnalysis,
  getQueueStatus,
  type AnalysisStatus,
} from '@/lib/cache'

// ============================================================
// 타입 정의
// ============================================================

interface StatusResponse {
  repoFullName: string
  status: AnalysisStatus['status']
  progress: number
  cached: boolean
  startedAt?: string
  completedAt?: string
  error?: string
}

interface QueueStatusResponse {
  queue: {
    total: number
    analyzing: number
    completed: number
    failed: number
  }
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

    // 특정 레포 상태 조회
    if (repo) {
      const status = getAnalysisStatus(repo)
      const cached = await getCachedAnalysis(user.id, repo)

      const response: StatusResponse = {
        repoFullName: repo,
        status: cached ? 'completed' : status.status,
        progress: cached ? 100 : status.progress,
        cached: cached !== null,
        startedAt: status.startedAt,
        completedAt: status.completedAt || cached?.analyzedAt,
        error: status.error,
      }

      return NextResponse.json(response)
    }

    // 전체 큐 상태 조회
    const queueStatus = getQueueStatus()

    const response: QueueStatusResponse = {
      queue: queueStatus,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Analysis status error:', error)
    return NextResponse.json(
      { error: '상태를 조회할 수 없습니다', details: String(error) },
      { status: 500 }
    )
  }
}
