/**
 * useAuth - 인증 상태 캐시 Hook
 * SWR 기반 세션 캐시 + 자동 revalidation
 */

import useSWR from 'swr'
import { getSession, onAuthStateChange } from '@/lib/supabase'
import { useEffect } from 'react'

const SESSION_CACHE_KEY = 'auth-session'

// 세션 fetcher
const sessionFetcher = async () => {
  const session = await getSession()
  return session
}

export function useAuth() {
  const { data: session, error, isLoading, mutate } = useSWR(
    SESSION_CACHE_KEY,
    sessionFetcher,
    {
      revalidateOnFocus: false,      // 포커스 시 재검증 비활성화
      revalidateOnReconnect: true,   // 재연결 시 검증
      dedupingInterval: 60000,       // 1분간 중복 요청 방지
      errorRetryCount: 2,            // 에러 시 2번 재시도
    }
  )

  // 인증 상태 변경 감지
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        mutate() // 캐시 갱신
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [mutate])

  return {
    session,
    isLoggedIn: !!session,
    isLoading,
    error,
    refresh: mutate,
  }
}
