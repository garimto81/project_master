/**
 * Analysis Cache - 서버사이드 분석 결과 캐싱
 * 재방문 시 즉시 로드를 위한 메모리 캐시
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
}

interface CacheOptions {
  /** TTL in milliseconds (default: 5 minutes) */
  ttl?: number
  /** Maximum cache size (default: 100 entries) */
  maxSize?: number
}

class AnalysisCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private ttl: number
  private maxSize: number

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? 5 * 60 * 1000  // 5분
    this.maxSize = options.maxSize ?? 100
  }

  /**
   * 캐시에서 데이터 조회
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // TTL 만료 확인
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // 히트 카운트 증가
    entry.hits++
    return entry.data
  }

  /**
   * 캐시에 데이터 저장
   */
  set(key: string, data: T): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    })
  }

  /**
   * 캐시 키 생성
   */
  static createKey(repo: string, depth: string, path: string): string {
    return `${repo}:${depth}:${path}`
  }

  /**
   * LRU 방식으로 가장 오래된 항목 제거
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      // 히트 카운트가 낮고 오래된 항목 우선 제거
      const score = entry.timestamp - entry.hits * 60000  // 히트당 1분 가중치
      if (score < oldestTime) {
        oldestTime = score
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * 캐시 통계
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    }
  }

  /**
   * 특정 레포의 캐시 무효화
   */
  invalidate(repoPrefix: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(repoPrefix)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * 전체 캐시 클리어
   */
  clear(): void {
    this.cache.clear()
  }
}

// 싱글톤 인스턴스 (서버 메모리에 유지)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const analysisCache = new AnalysisCache<any>({
  ttl: 5 * 60 * 1000,  // 5분
  maxSize: 100,
})

// GitHub 트리 아이템 타입
export interface GitHubTreeItem {
  path: string
  type: string
  sha?: string
  size?: number
}

// 트리 데이터 캐시 (변경이 적으므로 더 긴 TTL)
export const treeCache = new AnalysisCache<{ tree: GitHubTreeItem[]; truncated?: boolean }>({
  ttl: 10 * 60 * 1000,  // 10분
  maxSize: 50,
})

// 이슈 데이터 캐시 (자주 변경되므로 짧은 TTL)
export const issuesCache = new AnalysisCache<unknown[]>({
  ttl: 2 * 60 * 1000,  // 2분
  maxSize: 50,
})
