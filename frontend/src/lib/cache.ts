/**
 * Cache Helper - Vercel KV 기반 캐시 관리
 * PRD-0007: 코드 시각화 시스템 재설계 (MVP)
 *
 * 기능:
 * - 분석 결과 캐시 (TTL 24시간)
 * - 캐시 키 관리
 * - 개발 환경 폴백 (메모리 캐시)
 */

import { kv } from '@vercel/kv'
import type { AstAnalysisResult } from './ast-analyzer'

// ============================================================
// 상수
// ============================================================

const CACHE_CONFIG = {
  TTL_SECONDS: 60 * 60 * 24, // 24시간
  MAX_REPOS_PER_USER: 10,
  KEY_PREFIX: 'analysis',
}

// ============================================================
// 타입 정의
// ============================================================

export interface CachedAnalysis {
  data: AstAnalysisResult
  commitSha: string | null
  analyzedAt: string
  version: string
}

export interface AnalysisStatus {
  repoFullName: string
  status: 'idle' | 'analyzing' | 'completed' | 'failed'
  progress: number
  startedAt?: string
  completedAt?: string
  error?: string
}

// ============================================================
// 메모리 캐시 (개발 환경 폴백)
// ============================================================

const memoryCache = new Map<string, { data: CachedAnalysis; expiresAt: number }>()
const analysisQueue = new Map<string, AnalysisStatus>()

function isVercelKVAvailable(): boolean {
  // Vercel KV 환경 변수 확인
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

// ============================================================
// 캐시 키 생성
// ============================================================

export function getCacheKey(userId: string, repoFullName: string): string {
  return `${CACHE_CONFIG.KEY_PREFIX}:${userId}:${repoFullName}`
}

export function getStatusKey(repoFullName: string): string {
  return `status:${repoFullName}`
}

// ============================================================
// 캐시 조회
// ============================================================

export async function getCachedAnalysis(
  userId: string,
  repoFullName: string
): Promise<CachedAnalysis | null> {
  const key = getCacheKey(userId, repoFullName)

  if (isVercelKVAvailable()) {
    try {
      const cached = await kv.get<CachedAnalysis>(key)
      return cached
    } catch (error) {
      console.error('Vercel KV get error:', error)
      return null
    }
  }

  // 메모리 캐시 폴백
  const cached = memoryCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }
  memoryCache.delete(key)
  return null
}

// ============================================================
// 캐시 저장
// ============================================================

export async function setCachedAnalysis(
  userId: string,
  repoFullName: string,
  data: AstAnalysisResult,
  commitSha: string | null = null
): Promise<boolean> {
  const key = getCacheKey(userId, repoFullName)

  const cached: CachedAnalysis = {
    data,
    commitSha,
    analyzedAt: new Date().toISOString(),
    version: '1.0.0',
  }

  if (isVercelKVAvailable()) {
    try {
      await kv.set(key, cached, { ex: CACHE_CONFIG.TTL_SECONDS })
      return true
    } catch (error) {
      console.error('Vercel KV set error:', error)
      return false
    }
  }

  // 메모리 캐시 폴백
  memoryCache.set(key, {
    data: cached,
    expiresAt: Date.now() + CACHE_CONFIG.TTL_SECONDS * 1000,
  })
  return true
}

// ============================================================
// 캐시 삭제
// ============================================================

export async function deleteCachedAnalysis(
  userId: string,
  repoFullName: string
): Promise<boolean> {
  const key = getCacheKey(userId, repoFullName)

  if (isVercelKVAvailable()) {
    try {
      await kv.del(key)
      return true
    } catch (error) {
      console.error('Vercel KV del error:', error)
      return false
    }
  }

  // 메모리 캐시 폴백
  memoryCache.delete(key)
  return true
}

// ============================================================
// 분석 상태 관리 (메모리 기반)
// ============================================================

export function getAnalysisStatus(repoFullName: string): AnalysisStatus {
  const existing = analysisQueue.get(repoFullName)
  if (existing) {
    return existing
  }

  return {
    repoFullName,
    status: 'idle',
    progress: 0,
  }
}

export function setAnalysisStatus(
  repoFullName: string,
  status: Partial<AnalysisStatus>
): void {
  const current = getAnalysisStatus(repoFullName)
  analysisQueue.set(repoFullName, { ...current, ...status })
}

export function startAnalysis(repoFullName: string): void {
  setAnalysisStatus(repoFullName, {
    status: 'analyzing',
    progress: 0,
    startedAt: new Date().toISOString(),
  })
}

export function updateProgress(repoFullName: string, progress: number): void {
  setAnalysisStatus(repoFullName, { progress: Math.min(100, Math.max(0, progress)) })
}

export function completeAnalysis(repoFullName: string): void {
  setAnalysisStatus(repoFullName, {
    status: 'completed',
    progress: 100,
    completedAt: new Date().toISOString(),
  })
}

export function failAnalysis(repoFullName: string, error: string): void {
  setAnalysisStatus(repoFullName, {
    status: 'failed',
    error,
    completedAt: new Date().toISOString(),
  })
}

export function clearAnalysisStatus(repoFullName: string): void {
  analysisQueue.delete(repoFullName)
}

// ============================================================
// 배치 캐시 확인
// ============================================================

export async function checkCacheStatus(
  userId: string,
  repos: string[]
): Promise<{
  cached: string[]
  notCached: string[]
}> {
  const results = await Promise.all(
    repos.map(async (repo) => {
      const cached = await getCachedAnalysis(userId, repo)
      return { repo, isCached: cached !== null }
    })
  )

  return {
    cached: results.filter((r) => r.isCached).map((r) => r.repo),
    notCached: results.filter((r) => !r.isCached).map((r) => r.repo),
  }
}

// ============================================================
// 유틸리티
// ============================================================

export function getCacheConfig() {
  return {
    ...CACHE_CONFIG,
    isVercelKVAvailable: isVercelKVAvailable(),
  }
}

// 메모리 캐시 정리 (만료된 항목 제거)
export function cleanupMemoryCache(): number {
  const now = Date.now()
  let cleaned = 0

  for (const [key, value] of memoryCache.entries()) {
    if (value.expiresAt <= now) {
      memoryCache.delete(key)
      cleaned++
    }
  }

  return cleaned
}

// 분석 큐 상태 조회
export function getQueueStatus(): {
  total: number
  analyzing: number
  completed: number
  failed: number
} {
  let analyzing = 0
  let completed = 0
  let failed = 0

  for (const status of analysisQueue.values()) {
    if (status.status === 'analyzing') analyzing++
    else if (status.status === 'completed') completed++
    else if (status.status === 'failed') failed++
  }

  return {
    total: analysisQueue.size,
    analyzing,
    completed,
    failed,
  }
}
