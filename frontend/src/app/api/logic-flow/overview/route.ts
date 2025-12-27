/**
 * Logic Flow API - Project Overview (Level 1)
 * PRD v6.2 Section 1.2: 다층 시각화 시스템
 *
 * 프로젝트 전체 모듈 구조를 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

interface GitHubIssue {
  title: string
  body?: string
}

interface Module {
  name: string
  path: string
  status: 'normal' | 'error' | 'warning'
  issue_count: number
  function_count: number
}

interface OverviewResponse {
  level: 'project'
  repo: string
  modules: Module[]
  mermaid_code: string
  summary: {
    total_modules: number
    error_modules: number
    total_issues: number
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const repo = searchParams.get('repo')

  if (!repo) {
    return NextResponse.json({ error: 'repo parameter required' }, { status: 400 })
  }

  // 인증 확인
  const { token } = await getGitHubTokenFromSession()

  if (!token) {
    return NextResponse.json({ error: 'GitHub 인증이 필요합니다. 로그인해주세요.' }, { status: 401 })
  }

  try {
    // GitHub API로 레포지토리 구조 가져오기
    const [owner, repoName] = repo.split('/')

    // 1. 레포지토리 트리 가져오기
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/main?recursive=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!treeResponse.ok) {
      // main 브랜치가 없으면 master 시도
      const masterResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/trees/master?recursive=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      )
      if (!masterResponse.ok) {
        throw new Error('Failed to fetch repository tree')
      }
    }

    const treeData = await treeResponse.json()

    // 2. 이슈 목록 가져오기 (에러 상태 확인용)
    const issuesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/issues?state=open&labels=bug&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    const issues = issuesResponse.ok ? await issuesResponse.json() : []

    // 3. 디렉토리에서 모듈 추출 (src/ 또는 루트의 주요 디렉토리)
    const directories = new Map<string, { files: number; hasError: boolean }>()

    for (const item of treeData.tree || []) {
      if (item.type === 'blob' && (item.path.endsWith('.ts') || item.path.endsWith('.tsx') || item.path.endsWith('.py') || item.path.endsWith('.js'))) {
        const parts = item.path.split('/')
        let moduleName = parts[0]

        // src/ 하위면 src 다음 디렉토리를 모듈로
        if (parts[0] === 'src' && parts.length > 1) {
          moduleName = parts[1]
        }

        // frontend/backend 등 서브프로젝트
        if (['frontend', 'backend'].includes(parts[0]) && parts.length > 2) {
          moduleName = `${parts[0]}/${parts[2] === 'src' && parts.length > 3 ? parts[3] : parts[2]}`
        }

        const current = directories.get(moduleName) || { files: 0, hasError: false }
        current.files++

        // 버그 이슈가 해당 모듈과 관련 있는지 확인
        const hasRelatedBug = (issues as GitHubIssue[]).some((issue) =>
          issue.title.toLowerCase().includes(moduleName.toLowerCase()) ||
          issue.body?.toLowerCase().includes(moduleName.toLowerCase())
        )
        if (hasRelatedBug) current.hasError = true

        directories.set(moduleName, current)
      }
    }

    // 4. 모듈 목록 생성
    const modules: Module[] = Array.from(directories.entries())
      .filter(([name]) => !name.startsWith('.') && name !== 'node_modules')
      .slice(0, 12) // 최대 12개 모듈
      .map(([name, data]) => ({
        name,
        path: name.includes('/') ? name : `src/${name}/`,
        status: data.hasError ? 'error' : 'normal',
        issue_count: data.hasError ? 1 : 0,
        function_count: Math.min(data.files, 20), // 파일 수 기반 추정
      }))

    // 5. Mermaid 다이어그램 생성 (Block Diagram)
    const mermaidLines = ['block-beta', '  columns 4']
    for (const mod of modules) {
      const icon = mod.status === 'error' ? '🔴' : ''
      const style = mod.status === 'error' ? ':::error' : ''
      mermaidLines.push(`  ${mod.name.replace(/[^a-zA-Z0-9]/g, '_')}["${mod.name} ${icon}"]${style}`)
    }
    mermaidLines.push('  classDef error fill:#dc2626,color:#fff')

    const response: OverviewResponse = {
      level: 'project',
      repo,
      modules,
      mermaid_code: mermaidLines.join('\n'),
      summary: {
        total_modules: modules.length,
        error_modules: modules.filter(m => m.status === 'error').length,
        total_issues: issues.length,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Logic flow overview error:', error)
    return NextResponse.json({ error: '프로젝트 구조를 불러올 수 없습니다' }, { status: 500 })
  }
}
