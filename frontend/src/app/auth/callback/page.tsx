'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * OAuth Callback 내부 컴포넌트
 * useSearchParams를 사용하므로 Suspense로 감싸야 함
 */
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase가 URL hash에서 자동으로 세션을 처리
        if (supabase) {
          const { data, error } = await supabase.auth.getSession()

          if (error) {
            console.error('Auth callback error:', error)
          }

          if (data.session) {
            console.log('Login successful:', data.session.user.email)
          }
        }

        // returnTo 파라미터가 있으면 해당 경로로, 없으면 홈으로
        const returnTo = searchParams.get('returnTo') || '/'
        router.replace(returnTo)
      } catch (err) {
        console.error('Callback processing error:', err)
        router.replace('/')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#fff',
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>DevFlow</h1>
      <p style={{ color: '#94a3b8' }}>로그인 처리 중...</p>
      <div style={{
        marginTop: '20px',
        width: '40px',
        height: '40px',
        border: '3px solid #3b82f6',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}

/**
 * OAuth Callback Page
 * Supabase OAuth 인증 후 리디렉션되는 페이지
 * useSearchParams()를 Suspense로 감싸서 정적 생성 오류 방지
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#fff',
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>DevFlow</h1>
        <p style={{ color: '#94a3b8' }}>로딩 중...</p>
      </main>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
