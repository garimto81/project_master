/**
 * useRepositories - 레포지토리 목록 캐시 Hook
 * SWR 기반 캐시 + stale-while-revalidate 전략
 */

import useSWR from 'swr'
import { getRepositories, type Repository } from '@/lib/api'

const REPOS_CACHE_KEY = 'github-repositories'

// 폴백 데이터
const FALLBACK_REPOS: Repository[] = [
  {
    id: 1,
    name: 'claude',
    full_name: 'garimto81/claude',
    description: 'AI-Native Developer Dashboard',
    language: 'TypeScript',
    open_issues_count: 5,
    stargazers_count: 10,
    updated_at: new Date().toISOString(),
  },
]

// 레포지토리 fetcher
const reposFetcher = async () => {
  const response = await getRepositories()
  return response.repositories
}

export function useRepositories(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? REPOS_CACHE_KEY : null, // enabled가 false면 fetch 안 함
    reposFetcher,
    {
      revalidateOnFocus: false,       // 포커스 시 재검증 비활성화
      revalidateOnReconnect: true,    // 재연결 시 검증
      dedupingInterval: 300000,       // 5분간 중복 요청 방지
      errorRetryCount: 2,             // 에러 시 2번 재시도
      fallbackData: undefined,        // 초기 데이터 없음
      keepPreviousData: true,         // 이전 데이터 유지
    }
  )

  return {
    repositories: data ?? (error ? FALLBACK_REPOS : []),
    isLoading,
    error,
    refresh: mutate,
  }
}
