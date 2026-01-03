/**
 * useAuth - 인증 상태 캐시 Hook
 * SWR 기반 세션 캐시 + 자동 revalidation
 *
 * v6.2 Fix: getSession() 대신 validateSession()으로 서버 검증
 * GitHub Issue #39: 첫 접속 시 로그인 상태 불일치 (캐시 문제) 수정
 */

import useSWR from 'swr'
import { validateSession, signOut, onAuthStateChange } from '@/lib/supabase'
import { useEffect, useCallback } from 'react'

const SESSION_CACHE_KEY = 'auth-session-validated'

// 검증된 세션 fetcher (서버에서 토큰 유효성 확인)
const validatedSessionFetcher = async () => {
  const result = await validateSession()

  // 세션이 무효하고 로그아웃이 필요한 경우
  if (result.shouldLogout) {
    console.log('[useAuth] Auto logout - invalid session detected')
    await signOut()
    return null
  }

  if (!result.valid) {
    return null
  }

  return result.user
}

export function useAuth() {
  const { data: user, error, isLoading, mutate } = useSWR(
    SESSION_CACHE_KEY,
    validatedSessionFetcher,
    {
      revalidateOnFocus: true,       // 포커스 시 재검증 (중요!)
      revalidateOnReconnect: true,   // 재연결 시 검증
      dedupingInterval: 30000,       // 30초간 중복 요청 방지 (더 짧게)
      errorRetryCount: 2,            // 에러 시 2번 재시도
    }
  )

  // 수동 새로고침 함수
  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

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
    user,
    isLoggedIn: !!user,
    isLoading,
    error,
    refresh,
  }
}
