/**
 * LazyLoader - Level 2-3 지연 로딩
 * 클릭 시에만 상세 데이터를 로드하여 초기 로딩 속도 개선
 */

import { AnalysisResult, ModuleInfo, FunctionInfo } from '@/lib/types'

export interface LazyLoadOptions {
  cacheTime?: number  // 캐시 유효 시간 (ms)
  preloadThreshold?: number  // 미리 로딩할 거리 (뷰포트 기준)
  maxConcurrent?: number  // 최대 동시 로딩 수
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  loading: boolean
}

interface LoadingState {
  loading: Set<string>
  queue: string[]
}

const DEFAULT_OPTIONS: Required<LazyLoadOptions> = {
  cacheTime: 5 * 60 * 1000,  // 5분
  preloadThreshold: 2,
  maxConcurrent: 3,
}

class LazyLoaderImpl {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private options: Required<LazyLoadOptions>
  private state: LoadingState = {
    loading: new Set(),
    queue: [],
  }
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map()

  constructor(options: LazyLoadOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * 모듈 상세 정보 지연 로딩
   */
  async loadModuleDetails(
    modulePath: string,
    fetcher: () => Promise<ModuleInfo>
  ): Promise<ModuleInfo> {
    const cacheKey = `module:${modulePath}`
    return this.loadWithCache(cacheKey, fetcher) as Promise<ModuleInfo>
  }

  /**
   * 함수 실행 흐름 지연 로딩
   */
  async loadFunctionTrace(
    functionPath: string,
    fetcher: () => Promise<FunctionInfo[]>
  ): Promise<FunctionInfo[]> {
    const cacheKey = `trace:${functionPath}`
    return this.loadWithCache(cacheKey, fetcher) as Promise<FunctionInfo[]>
  }

  /**
   * 의존성 그래프 지연 로딩
   */
  async loadDependencyGraph(
    repoPath: string,
    fetcher: () => Promise<AnalysisResult>
  ): Promise<AnalysisResult> {
    const cacheKey = `deps:${repoPath}`
    return this.loadWithCache(cacheKey, fetcher) as Promise<AnalysisResult>
  }

  /**
   * 캐시를 활용한 로딩
   */
  private async loadWithCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // 캐시 확인
    const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined
    if (cached && !this.isExpired(cached)) {
      return cached.data
    }

    // 이미 로딩 중인 경우 대기
    if (this.state.loading.has(cacheKey)) {
      return this.waitForLoad<T>(cacheKey)
    }

    // 동시 로딩 제한 확인
    if (this.state.loading.size >= this.options.maxConcurrent) {
      await this.waitForSlot()
    }

    // 로딩 시작
    this.state.loading.add(cacheKey)
    this.cache.set(cacheKey, {
      data: null as unknown as T,
      timestamp: Date.now(),
      loading: true,
    })

    try {
      const data = await fetcher()

      // 캐시 저장
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        loading: false,
      })

      // 리스너 호출
      this.notifyListeners(cacheKey, data)

      return data
    } catch (error) {
      this.cache.delete(cacheKey)
      throw error
    } finally {
      this.state.loading.delete(cacheKey)
      this.processQueue()
    }
  }

  /**
   * 캐시 만료 확인
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > this.options.cacheTime
  }

  /**
   * 로딩 완료 대기
   */
  private waitForLoad<T>(cacheKey: string): Promise<T> {
    return new Promise((resolve) => {
      if (!this.listeners.has(cacheKey)) {
        this.listeners.set(cacheKey, new Set())
      }
      this.listeners.get(cacheKey)!.add((data) => resolve(data as T))
    })
  }

  /**
   * 슬롯 대기
   */
  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.state.loading.size < this.options.maxConcurrent) {
          resolve()
        } else {
          setTimeout(checkSlot, 100)
        }
      }
      checkSlot()
    })
  }

  /**
   * 리스너 알림
   */
  private notifyListeners(cacheKey: string, data: unknown): void {
    const listeners = this.listeners.get(cacheKey)
    if (listeners) {
      listeners.forEach(callback => callback(data))
      this.listeners.delete(cacheKey)
    }
  }

  /**
   * 큐 처리
   */
  private processQueue(): void {
    if (this.state.queue.length > 0 && this.state.loading.size < this.options.maxConcurrent) {
      const next = this.state.queue.shift()
      if (next) {
        // 큐에서 다음 항목 처리
        this.notifyListeners(next, null)
      }
    }
  }

  /**
   * 미리 로딩 (Preload)
   */
  preload<T>(cacheKey: string, fetcher: () => Promise<T>): void {
    if (!this.cache.has(cacheKey) && !this.state.loading.has(cacheKey)) {
      this.loadWithCache(cacheKey, fetcher).catch(() => {
        // Preload 실패는 무시
      })
    }
  }

  /**
   * 캐시 무효화
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 캐시 통계
   */
  getStats() {
    const entries = Array.from(this.cache.entries())
    return {
      totalEntries: entries.length,
      loadingCount: this.state.loading.size,
      queueLength: this.state.queue.length,
      cacheSize: entries.reduce((sum, [, entry]) => {
        return sum + JSON.stringify(entry.data).length
      }, 0),
      oldestEntry: entries.reduce((oldest, [, entry]) => {
        return entry.timestamp < oldest ? entry.timestamp : oldest
      }, Date.now()),
    }
  }
}

// 싱글톤 인스턴스
export const lazyLoader = new LazyLoaderImpl()

// React Hook은 별도 파일에서 사용
// useLazyLoad hook은 클라이언트 컴포넌트에서 직접 구현하세요

export default lazyLoader
