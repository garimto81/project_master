/**
 * DiagramCache - IndexedDB 기반 다이어그램 캐싱
 * 오프라인 지원 및 재방문 시 빠른 로딩
 */

export interface CachedDiagram {
  key: string
  mermaidCode: string
  svgContent?: string
  analysisResult?: string  // JSON 직렬화된 분석 결과
  createdAt: number
  expiresAt: number
  version: string
}

interface CacheConfig {
  dbName: string
  storeName: string
  maxAge: number  // ms
  maxSize: number  // bytes
  version: string
}

const DEFAULT_CONFIG: CacheConfig = {
  dbName: 'devflow-diagram-cache',
  storeName: 'diagrams',
  maxAge: 24 * 60 * 60 * 1000,  // 24시간
  maxSize: 50 * 1024 * 1024,  // 50MB
  version: '1.0.0',
}

class DiagramCacheImpl {
  private config: CacheConfig
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * IndexedDB 초기화
   */
  private async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      // 서버 사이드에서는 IndexedDB 사용 불가
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve()
        return
      }

      const request = indexedDB.open(this.config.dbName, 1)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 다이어그램 스토어 생성
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, { keyPath: 'key' })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  /**
   * 다이어그램 저장
   */
  async set(key: string, mermaidCode: string, svgContent?: string, analysisResult?: object): Promise<void> {
    await this.init()
    if (!this.db) return

    const now = Date.now()
    const entry: CachedDiagram = {
      key,
      mermaidCode,
      svgContent,
      analysisResult: analysisResult ? JSON.stringify(analysisResult) : undefined,
      createdAt: now,
      expiresAt: now + this.config.maxAge,
      version: this.config.version,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.config.storeName, 'readwrite')
      const store = transaction.objectStore(this.config.storeName)
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 다이어그램 조회
   */
  async get(key: string): Promise<CachedDiagram | null> {
    await this.init()
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.config.storeName, 'readonly')
      const store = transaction.objectStore(this.config.storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        const entry = request.result as CachedDiagram | undefined
        if (entry && entry.expiresAt > Date.now() && entry.version === this.config.version) {
          resolve(entry)
        } else {
          // 만료된 항목은 삭제
          if (entry) {
            this.delete(key).catch(() => {})
          }
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 다이어그램 삭제
   */
  async delete(key: string): Promise<void> {
    await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.config.storeName, 'readwrite')
      const store = transaction.objectStore(this.config.storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 만료된 항목 정리
   */
  async cleanup(): Promise<number> {
    await this.init()
    if (!this.db) return 0

    const now = Date.now()
    let deletedCount = 0

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.config.storeName, 'readwrite')
      const store = transaction.objectStore(this.config.storeName)
      const index = store.index('expiresAt')
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          resolve(deletedCount)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 전체 캐시 삭제
   */
  async clear(): Promise<void> {
    await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.config.storeName, 'readwrite')
      const store = transaction.objectStore(this.config.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 캐시 통계
   */
  async getStats(): Promise<{
    count: number
    size: number
    oldestEntry: number
    newestEntry: number
  }> {
    await this.init()
    if (!this.db) {
      return { count: 0, size: 0, oldestEntry: 0, newestEntry: 0 }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.config.storeName, 'readonly')
      const store = transaction.objectStore(this.config.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result as CachedDiagram[]
        const size = entries.reduce((sum, entry) => {
          return sum + (entry.mermaidCode?.length || 0) + (entry.svgContent?.length || 0)
        }, 0)

        const timestamps = entries.map(e => e.createdAt)

        resolve({
          count: entries.length,
          size,
          oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
          newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
        })
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 캐시 키 생성 헬퍼
   */
  static generateKey(owner: string, repo: string, path?: string): string {
    return path ? `${owner}/${repo}/${path}` : `${owner}/${repo}`
  }
}

// 싱글톤 인스턴스
export const diagramCache = new DiagramCacheImpl()

// React Hook
export function useDiagramCache() {
  return {
    get: diagramCache.get.bind(diagramCache),
    set: diagramCache.set.bind(diagramCache),
    delete: diagramCache.delete.bind(diagramCache),
    cleanup: diagramCache.cleanup.bind(diagramCache),
    clear: diagramCache.clear.bind(diagramCache),
    getStats: diagramCache.getStats.bind(diagramCache),
    generateKey: DiagramCacheImpl.generateKey,
  }
}

export default diagramCache
