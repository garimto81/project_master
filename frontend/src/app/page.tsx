'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type Repository } from '@/lib/api'
import { signInWithGitHub, signOut } from '@/lib/supabase'
import { useAuth, useRepositories } from '@/lib/hooks'

// 언어별 색상
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  default: '#64748b',
}

// OAuth 에러 메시지 매핑
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  auth_failed: '인증에 실패했습니다. 다시 시도해주세요.',
  code_expired: '인증 코드가 만료되었습니다. 다시 로그인해주세요.',
  invalid_code: '인증 코드가 유효하지 않습니다. 브라우저 새로고침 후 다시 시도해주세요.',
  code_missing: '인증 코드가 전달되지 않았습니다. 다시 시도해주세요.',
  pkce_error: '인증 세션이 만료되었습니다. 브라우저 쿠키를 확인하고 다시 로그인해주세요.',
  supabase_not_configured: '서버 설정 오류입니다. 관리자에게 문의하세요.',
}

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // URL에서 에러 파라미터 확인 (OAuth 콜백에서 리다이렉트된 경우)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessage = AUTH_ERROR_MESSAGES[errorParam] || AUTH_ERROR_MESSAGES.auth_failed
      setLoginError(errorMessage)
      // URL에서 에러 파라미터 제거 (히스토리에 남지 않도록)
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  // SWR 기반 캐시 hooks
  const { isLoggedIn, isLoading: isAuthLoading, refresh: refreshAuth } = useAuth()
  const { repositories, isLoading: isReposLoading } = useRepositories(isLoggedIn)

  const isLoading = isAuthLoading || isReposLoading

  // GitHub 로그인 핸들러
  const handleGitHubLogin = async () => {
    setLoginError(null)
    setIsLoggingIn(true)

    try {
      const { error } = await signInWithGitHub()
      if (error) {
        console.error('Login error:', error)
        setLoginError(error.message || '로그인 중 오류가 발생했습니다.')
        setIsLoggingIn(false)
      }
      // 성공 시 리다이렉트되므로 isLoggingIn 상태는 유지
    } catch (err) {
      console.error('Unexpected login error:', err)
      setLoginError('예상치 못한 오류가 발생했습니다. 다시 시도해주세요.')
      setIsLoggingIn(false)
    }
  }

  // 검색 필터링
  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 프로젝트 선택 핸들러
  const handleSelectProject = (repo: Repository) => {
    // URL에 레포지토리 정보를 쿼리로 전달
    router.push(`/project?repo=${encodeURIComponent(repo.full_name)}`)
  }

  // 로그인 전 화면
  if (!isLoggedIn) {
    return (
      <main data-testid="login-page" style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '0' }}>DevFlow</h1>
          <span data-testid="version-badge" style={{
            fontSize: '0.75rem',
            color: '#64748b',
            background: 'rgba(100, 116, 139, 0.2)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}>
            v{process.env.NEXT_PUBLIC_APP_VERSION || '6.2.0'}
          </span>
        </div>
        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>비개발자를 위한 AI 협업 개발 플랫폼</p>

        {loginError && (
          <div data-testid="login-error" style={{
            marginBottom: '1rem',
            padding: '12px 24px',
            background: 'rgba(220, 38, 38, 0.2)',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.9rem',
          }}>
            {loginError}
          </div>
        )}

        <button
          data-testid="github-login-btn"
          onClick={handleGitHubLogin}
          disabled={isLoggingIn}
          style={{
            padding: '16px 32px',
            fontSize: '1.1rem',
            background: isLoggingIn ? '#4a5568' : '#24292f',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isLoggingIn ? 0.7 : 1,
          }}
        >
          {isLoggingIn ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
              로그인 중...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub로 로그인
            </>
          )}
        </button>
      </main>
    )
  }

  // 로그인 후 프로젝트 선택 화면 (칸반 보드)
  return (
    <main data-testid="dashboard" style={{
      minHeight: '100vh',
      background: '#f1f5f9',
    }}>
      {/* 헤더 */}
      <header data-testid="header" style={{
        background: '#fff',
        padding: '16px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>DevFlow</h1>
          <span style={{
            fontSize: '0.65rem',
            color: '#64748b',
            background: '#f1f5f9',
            padding: '2px 6px',
            borderRadius: '4px',
          }}>
            v{process.env.NEXT_PUBLIC_APP_VERSION || '6.2.0'}
          </span>
        </div>
        <button
          data-testid="logout-btn"
          onClick={async () => {
            await signOut()
            refreshAuth() // SWR 캐시 갱신
          }}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </header>

      {/* 프로젝트 선택 영역 */}
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>프로젝트 선택</h2>
          <p style={{ margin: 0, color: '#64748b' }}>작업할 GitHub 레포지토리를 선택하세요</p>
        </div>

        {/* 검색 */}
        <input
          type="search"
          placeholder="프로젝트 검색..."
          data-testid="project-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px 16px',
            fontSize: '1rem',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        />

        {/* 칸반 보드 형식 카드 그리드 */}
        <section data-testid="project-list" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
              레포지토리 로딩 중...
            </div>
          ) : filteredRepos.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
              프로젝트가 없습니다
            </div>
          ) : (
            filteredRepos.map(repo => (
              <article
                key={repo.id}
                data-testid="project-item"
                onClick={() => handleSelectProject(repo)}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                {/* 레포지토리 이름 */}
                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#1e293b' }}>
                  {repo.name}
                </h3>

                {/* full_name (owner/repo) */}
                <p style={{
                  margin: '0 0 12px',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                }}>
                  {repo.full_name}
                </p>

                {/* 설명 */}
                <p style={{
                  margin: '0 0 16px',
                  color: '#64748b',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  minHeight: '42px',
                }}>
                  {repo.description || '설명 없음'}
                </p>

                {/* 메타 정보 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}>
                  {/* 언어 */}
                  {repo.language && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.default,
                      }} />
                      {repo.language}
                    </span>
                  )}

                  {/* 이슈 수 */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: repo.open_issues_count > 0 ? '#dc2626' : '#64748b' }}>
                      {repo.open_issues_count > 0 ? '🔴' : '⚪'}
                    </span>
                    {repo.open_issues_count} 이슈
                  </span>

                  {/* 스타 */}
                  <span>⭐ {repo.stargazers_count}</span>
                </div>

                {/* 최근 업데이트 */}
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                }}>
                  최근 업데이트: {new Date(repo.updated_at).toLocaleDateString('ko-KR')}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}

// Suspense로 감싸서 useSearchParams() 사용 가능하게 함
export default function HomePage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#fff',
      }}>
        <div>로딩 중...</div>
      </main>
    }>
      <HomePageContent />
    </Suspense>
  )
}
