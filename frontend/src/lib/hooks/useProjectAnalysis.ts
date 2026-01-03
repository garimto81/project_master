/**
 * useProjectAnalysis - 프로젝트 분석 결과 Hook
 * PRD-0007: 코드 시각화 시스템 재설계 (MVP)
 *
 * 기능:
 * - SWR 기반 캐시 조회
 * - 분석 상태 폴링
 * - 캐시 미스 시 자동 트리거
 * - 새로고침 지원
 */

import { useEffect, useCallback } from 'react'
import useSWR from 'swr'
import type { CachedAnalysis, AnalysisStatus } from '@/lib/cache'

// ============================================================
// 타입 정의
// ============================================================

interface CachedResponse extends CachedAnalysis {
  cached: true
}

interface NotCachedResponse {
  cached: false
  error: 'not_cached'
}

interface StatusResponse {
  repoFullName: string
  status: AnalysisStatus['status']
  progress: number
  cached: boolean
  error?: string
}

type CacheResponse = CachedResponse | NotCachedResponse

// ============================================================
// Fetchers
// ============================================================

const cacheFetcher = async (url: string): Promise<CacheResponse> => {
  const response = await fetch(url)
  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to fetch cache')
  }
  return response.json()
}

const statusFetcher = async (url: string): Promise<StatusResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch status')
  }
  return response.json()
}

// ============================================================
// Hook
// ============================================================

export function useProjectAnalysis(repoFullName: string) {
  // 1. 캐시 조회
  const {
    data: cacheData,
    error: cacheError,
    mutate: refreshCache,
  } = useSWR<CacheResponse>(
    repoFullName ? `/api/analysis/cached?repo=${encodeURIComponent(repoFullName)}` : null,
    cacheFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1분
      errorRetryCount: 1,
    }
  )

  const isCached = cacheData?.cached === true
  const isNotCached = cacheData?.cached === false

  // 2. 분석 상태 폴링 (캐시 없을 때만)
  const { data: statusData } = useSWR<StatusResponse>(
    isNotCached ? `/api/analysis/status?repo=${encodeURIComponent(repoFullName)}` : null,
    statusFetcher,
    {
      refreshInterval: 2000, // 2초마다 폴링
      revalidateOnFocus: false,
    }
  )

  // 3. 캐시 미스 시 분석 트리거
  useEffect(() => {
    if (isNotCached && statusData?.status === 'idle') {
      // 분석 시작
      fetch('/api/analysis/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repos: [repoFullName] }),
      }).catch(console.error)
    }
  }, [isNotCached, statusData?.status, repoFullName])

  // 4. 분석 완료 시 캐시 새로고침
  useEffect(() => {
    if (statusData?.status === 'completed' && !isCached) {
      refreshCache()
    }
  }, [statusData?.status, isCached, refreshCache])

  // 5. 새로고침 함수
  const refresh = useCallback(async () => {
    // 캐시 삭제
    await fetch(`/api/analysis/cached?repo=${encodeURIComponent(repoFullName)}`, {
      method: 'DELETE',
    })

    // 재분석 트리거
    await fetch('/api/analysis/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repos: [repoFullName] }),
    })

    // 캐시 갱신
    refreshCache()
  }, [repoFullName, refreshCache])

  // 6. 상태 계산
  const isLoading = !cacheData && !cacheError
  const isAnalyzing = statusData?.status === 'analyzing'
  const isReady = isCached
  const progress = statusData?.progress ?? (isCached ? 100 : 0)
  const error = statusData?.error ?? (cacheError ? String(cacheError) : undefined)

  return {
    // 데이터
    analysis: isCached ? cacheData.data : null,
    analyzedAt: isCached ? cacheData.analyzedAt : null,
    commitSha: isCached ? cacheData.commitSha : null,

    // 상태
    isLoading,
    isAnalyzing,
    isReady,
    progress,
    error,

    // 액션
    refresh,
  }
}

// ============================================================
// 배치 트리거 Hook
// ============================================================

export function useTriggerAnalysis() {
  const trigger = useCallback(async (repos?: string[]) => {
    const response = await fetch('/api/analysis/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repos }),
    })

    if (!response.ok) {
      throw new Error('Failed to trigger analysis')
    }

    return response.json()
  }, [])

  return { trigger }
}
