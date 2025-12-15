'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * OAuth Callback Page
 * Supabase OAuth 인증 후 리디렉션되는 페이지
 * URL fragment에서 토큰을 추출하여 세션을 설정
 */
export default function AuthCallbackPage() {
  const router = useRouter()

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

        // 홈페이지로 리디렉션
        router.replace('/')
      } catch (err) {
        console.error('Callback processing error:', err)
        router.replace('/')
      }
    }

    handleCallback()
  }, [router])

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
