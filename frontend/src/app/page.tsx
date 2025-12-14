'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  if (!isLoggedIn) {
    return (
      <main className="login-page" data-testid="login-page">
        <h1>GitCommand Center</h1>
        <p>AI-Native Developer Dashboard</p>
        <button
          data-testid="github-login-btn"
          onClick={() => setIsLoggedIn(true)}
        >
          GitHub로 로그인
        </button>
      </main>
    )
  }

  return (
    <main className="dashboard" data-testid="dashboard">
      <header data-testid="header">
        <h1>GitCommand Center</h1>
        <button
          data-testid="logout-btn"
          onClick={() => setIsLoggedIn(false)}
        >
          로그아웃
        </button>
      </header>

      <section data-testid="project-list">
        <h2>프로젝트 목록</h2>
        <input
          type="search"
          placeholder="프로젝트 검색..."
          data-testid="project-search"
        />
        <ul>
          <li data-testid="project-item">
            <Link href="/project">sample-project</Link>
          </li>
        </ul>
      </section>
    </main>
  )
}
