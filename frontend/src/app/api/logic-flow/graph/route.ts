/**
 * Logic Flow API - Call Graph (PRD-0007)
 * 함수 호출 관계 + API/DB 호출 추적
 *
 * 기능:
 * - 함수 호출 그래프 생성
 * - 진입점 자동 탐지
 * - API 호출 매칭
 * - Supabase 호출 탐지
 * - 핫스팟 계산
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import {
  analyzeCallGraph,
  generateCallGraphMermaid,
  type CallGraphResult,
} from '@/lib/call-graph-analyzer'

// ============================================================
// 타입 정의
// ============================================================

interface GraphRequest {
  repo: string
  branch?: string
  entryPoints?: string[]
  maxDepth?: number
}

interface GraphResponse extends CallGraphResult {
  repo: string
  branch: string
  mermaidCode: string
}

interface GitHubTreeItem {
  path: string
  type: string
  size?: number
}

// ============================================================
// 설정
// ============================================================

const CONFIG = {
  MAX_FILES: 50,
  BATCH_SIZE: 5,
}

// ============================================================
// POST 핸들러
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. 요청 파싱
    let body: GraphRequest
    try {
      const text = await request.text()
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
      }
      body = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { repo, branch = 'main' } = body

    if (!repo) {
      return NextResponse.json({ error: 'repo parameter required' }, { status: 400 })
    }

    // 2. 인증 확인
    const { token } = await getGitHubTokenFromSession()
    if (!token) {
      return NextResponse.json(
        { error: 'GitHub 인증이 필요합니다. 로그인해주세요.' },
        { status: 401 }
      )
    }

    const [owner, repoName] = repo.split('/')

    // 3. 레포지토리 트리 가져오기
    const treeData = await fetchRepoTree(owner, repoName, branch, token)

    // 4. 코드 파일 필터링
    const codeFiles = filterCodeFiles(treeData.tree)

    if (codeFiles.length === 0) {
      return NextResponse.json({
        repo,
        branch,
        nodes: [],
        edges: [],
        apiCalls: [],
        dbCalls: [],
        entryPoints: { pages: [], apiRoutes: [], eventHandlers: [] },
        hotspots: [],
        stats: {
          totalFunctions: 0,
          totalCalls: 0,
          totalApiCalls: 0,
          totalDbCalls: 0,
          analysisTimeMs: Date.now() - startTime,
        },
        mermaidCode: 'flowchart TB\n  A["분석할 파일 없음"]',
      })
    }

    // 5. 파일 내용 가져오기
    const filesWithContent = await fetchFileContents(owner, repoName, codeFiles, token)

    // 6. 호출 그래프 분석
    const result = analyzeCallGraph(filesWithContent)

    // 7. Mermaid 다이어그램 생성
    const mermaidCode = generateCallGraphMermaid(result)

    // 8. 응답 반환
    const response: GraphResponse = {
      repo,
      branch,
      ...result,
      stats: {
        ...result.stats,
        analysisTimeMs: Date.now() - startTime,
      },
      mermaidCode,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Call graph error:', error)
    return NextResponse.json(
      { error: '호출 그래프 분석을 수행할 수 없습니다', details: String(error) },
      { status: 500 }
    )
  }
}

// ============================================================
// 헬퍼 함수
// ============================================================

async function fetchRepoTree(
  owner: string,
  repoName: string,
  branch: string,
  token: string
): Promise<{ tree: GitHubTreeItem[] }> {
  const branches = branch === 'main' ? ['main', 'master'] : [branch]

  for (const b of branches) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/${b}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (response.ok) {
      return response.json()
    }
  }

  throw new Error(`Failed to fetch tree for ${owner}/${repoName}`)
}

function filterCodeFiles(tree: GitHubTreeItem[]): GitHubTreeItem[] {
  return tree
    .filter((item) => {
      if (item.type !== 'blob') return false
      if (!item.path.match(/\.(tsx?|jsx?)$/)) return false
      if (item.path.includes('.test.') || item.path.includes('.spec.')) return false
      if (item.path.includes('__tests__')) return false
      if (item.path.includes('.config.')) return false
      if (item.path.endsWith('.d.ts')) return false
      if (item.path.includes('node_modules')) return false

      return (
        item.path.startsWith('src/') ||
        item.path.startsWith('pages/') ||
        item.path.startsWith('app/')
      )
    })
    .slice(0, CONFIG.MAX_FILES)
}

async function fetchFileContents(
  owner: string,
  repo: string,
  files: GitHubTreeItem[],
  token: string
): Promise<Array<{ path: string; content: string }>> {
  const results: Array<{ path: string; content: string }> = []

  for (let i = 0; i < files.length; i += CONFIG.BATCH_SIZE) {
    const batch = files.slice(i, i + CONFIG.BATCH_SIZE)

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            if (data.content) {
              const content = Buffer.from(data.content, 'base64').toString('utf-8')
              return { path: file.path, content }
            }
          }
        } catch {
          // 개별 파일 실패 무시
        }
        return null
      })
    )

    results.push(
      ...batchResults.filter((r): r is { path: string; content: string } => r !== null)
    )
  }

  return results
}

// ============================================================
// GET 핸들러 (테스트용)
// ============================================================

export async function GET() {
  return NextResponse.json({
    name: 'Call Graph API',
    version: '1.0.0',
    description: '함수 호출 그래프 분석 API (PRD-0007)',
    usage: {
      method: 'POST',
      body: {
        repo: 'owner/repo (required)',
        branch: 'main (default)',
        entryPoints: "['src/app/page.tsx'] (optional)",
        maxDepth: '10 (default)',
      },
    },
  })
}
