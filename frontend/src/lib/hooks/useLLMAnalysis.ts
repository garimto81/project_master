/**
 * LLM 분석 Hook
 * Issues: #61 (모듈 제목), #62 (모듈 설명)
 *
 * Local Ollama (Qwen3) 모델을 사용한 코드 분석
 */

import { useState, useCallback } from 'react'

interface ModuleAnalysis {
  path: string
  title: string
  description?: string
  role?: string
  inputs?: string[]
  outputs?: string[]
  relatedModules?: string[]
  icon?: string
}

interface LLMStatus {
  available: boolean
  models: string[]
}

interface UseLLMAnalysisReturn {
  // 상태
  isAnalyzing: boolean
  error: string | null
  llmStatus: LLMStatus | null

  // 분석 결과
  moduleAnalyses: Map<string, ModuleAnalysis>

  // 액션
  checkLLMStatus: () => Promise<LLMStatus>
  analyzeModuleTitles: (repo: string, files: Array<{ path: string; layer: string }>) => Promise<ModuleAnalysis[]>
  analyzeModuleDescriptions: (repo: string, files: Array<{ path: string; layer: string }>) => Promise<ModuleAnalysis[]>
  clearCache: () => void
}

export function useLLMAnalysis(): UseLLMAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [llmStatus, setLLMStatus] = useState<LLMStatus | null>(null)
  const [moduleAnalyses, setModuleAnalyses] = useState<Map<string, ModuleAnalysis>>(new Map())

  /**
   * Ollama 서버 상태 확인
   */
  const checkLLMStatus = useCallback(async (): Promise<LLMStatus> => {
    try {
      const res = await fetch('/api/logic-flow/llm-analyze')
      if (!res.ok) {
        const status = { available: false, models: [] }
        setLLMStatus(status)
        return status
      }

      const data = await res.json()
      const status = {
        available: data.ollama?.available || false,
        models: data.ollama?.models || [],
      }
      setLLMStatus(status)
      return status
    } catch {
      const status = { available: false, models: [] }
      setLLMStatus(status)
      return status
    }
  }, [])

  /**
   * 모듈 제목 분석 (Issue #61)
   */
  const analyzeModuleTitles = useCallback(async (
    repo: string,
    files: Array<{ path: string; layer: string }>
  ): Promise<ModuleAnalysis[]> => {
    if (files.length === 0) return []

    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/logic-flow/llm-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          files,
          mode: 'title',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        // Ollama 서버 미실행 시 fallback
        if (res.status === 503) {
          console.warn('[LLM] Ollama 서버 미실행, fallback 사용')
          return files.map(f => ({
            path: f.path,
            title: f.path.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || f.path,
            icon: getLayerIcon(f.layer),
          }))
        }
        throw new Error(data.error || 'LLM 분석 실패')
      }

      const data = await res.json()
      const results: ModuleAnalysis[] = data.results || []

      // 캐시 업데이트
      setModuleAnalyses(prev => {
        const updated = new Map(prev)
        for (const result of results) {
          updated.set(result.path, result)
        }
        return updated
      })

      return results
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LLM 분석 실패'
      setError(message)
      console.error('[LLM] Title analysis error:', err)

      // Fallback: 파일명 기반 제목
      return files.map(f => ({
        path: f.path,
        title: f.path.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || f.path,
        icon: getLayerIcon(f.layer),
      }))
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  /**
   * 모듈 설명 분석 (Issue #62)
   */
  const analyzeModuleDescriptions = useCallback(async (
    repo: string,
    files: Array<{ path: string; layer: string }>
  ): Promise<ModuleAnalysis[]> => {
    if (files.length === 0) return []

    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/logic-flow/llm-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          files,
          mode: 'description',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 503) {
          console.warn('[LLM] Ollama 서버 미실행, fallback 사용')
          return files.map(f => ({
            path: f.path,
            title: f.path.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || f.path,
            description: getDefaultDescription(f.layer),
          }))
        }
        throw new Error(data.error || 'LLM 분석 실패')
      }

      const data = await res.json()
      const results: ModuleAnalysis[] = data.results || []

      // 캐시 업데이트
      setModuleAnalyses(prev => {
        const updated = new Map(prev)
        for (const result of results) {
          updated.set(result.path, result)
        }
        return updated
      })

      return results
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LLM 분석 실패'
      setError(message)
      console.error('[LLM] Description analysis error:', err)

      // Fallback: 기본 설명
      return files.map(f => ({
        path: f.path,
        title: f.path.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || f.path,
        description: getDefaultDescription(f.layer),
      }))
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  /**
   * 캐시 초기화
   */
  const clearCache = useCallback(() => {
    setModuleAnalyses(new Map())
    setError(null)
  }, [])

  return {
    isAnalyzing,
    error,
    llmStatus,
    moduleAnalyses,
    checkLLMStatus,
    analyzeModuleTitles,
    analyzeModuleDescriptions,
    clearCache,
  }
}

// 유틸리티 함수
function getLayerIcon(layer: string): string {
  const icons: Record<string, string> = {
    ui: '🖥️',
    logic: '⚙️',
    api: '🌐',
    server: '🌐',
    data: '💾',
    lib: '🔧',
  }
  return icons[layer] || '📄'
}

function getDefaultDescription(layer: string): string {
  const descriptions: Record<string, string> = {
    ui: '사용자에게 보여지는 화면 컴포넌트입니다.',
    logic: '비즈니스 로직을 처리하는 모듈입니다.',
    api: '서버와 통신하는 API 모듈입니다.',
    server: '서버 요청을 처리하는 모듈입니다.',
    data: '데이터를 저장하고 관리하는 모듈입니다.',
    lib: '공통으로 사용되는 유틸리티 모듈입니다.',
  }
  return descriptions[layer] || '기능 모듈입니다.'
}
