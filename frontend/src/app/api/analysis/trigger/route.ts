/**
 * Analysis Trigger API - 백그라운드 분석 시작
 * PRD-0007: 코드 시각화 시스템 재설계 (MVP)
 *
 * 기능:
 * - 로그인 시 백그라운드 분석 시작
 * - 캐시 확인 → 미스 시 분석 트리거
 * - fire-and-forget 패턴
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import {
  setCachedAnalysis,
  startAnalysis,
  updateProgress,
  completeAnalysis,
  failAnalysis,
  checkCacheStatus,
} from '@/lib/cache'
import { analyzeMultipleFiles, type AstAnalysisResult } from '@/lib/ast-analyzer'

// ============================================================
// 타입 정의
// ============================================================

interface TriggerRequest {
  repos?: string[]
}

interface TriggerResponse {
  triggered: string[]
  cached: string[]
  message: string
}

interface GitHubRepo {
  full_name: string
  pushed_at: string
  private: boolean
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
  MAX_REPOS: 10,
  MAX_FILES_PER_REPO: 30,
  BATCH_SIZE: 5,
}

// ============================================================
// POST 핸들러
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const { token, user } = await getGitHubTokenFromSession()

    if (!token || !user) {
      return NextResponse.json(
        { error: 'GitHub 인증이 필요합니다. 로그인해주세요.' },
        { status: 401 }
      )
    }

    // 2. 요청 파싱
    let body: TriggerRequest = {}
    try {
      const text = await request.text()
      if (text && text.trim()) {
        body = JSON.parse(text)
      }
    } catch {
      // 빈 body 허용
    }

    // 3. 레포 목록 가져오기
    let repos = body.repos

    if (!repos || repos.length === 0) {
      repos = await getRecentRepos(token, CONFIG.MAX_REPOS)
    }

    if (repos.length === 0) {
      return NextResponse.json({
        triggered: [],
        cached: [],
        message: '분석할 레포지토리가 없습니다.',
      })
    }

    // 4. 캐시 상태 확인
    const cacheStatus = await checkCacheStatus(user.id, repos.slice(0, CONFIG.MAX_REPOS))

    // 5. 캐시 미스 레포에 대해 백그라운드 분석 시작
    for (const repo of cacheStatus.notCached) {
      // fire-and-forget: 응답을 기다리지 않고 분석 시작
      analyzeInBackground(user.id, repo, token).catch((err) => {
        console.error(`Background analysis failed for ${repo}:`, err)
      })
    }

    const response: TriggerResponse = {
      triggered: cacheStatus.notCached,
      cached: cacheStatus.cached,
      message: `${cacheStatus.cached.length}개 캐시됨, ${cacheStatus.notCached.length}개 분석 시작`,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Analysis trigger error:', error)
    return NextResponse.json(
      { error: '분석을 시작할 수 없습니다', details: String(error) },
      { status: 500 }
    )
  }
}

// ============================================================
// 헬퍼 함수
// ============================================================

async function getRecentRepos(token: string, limit: number): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.github.com/user/repos?sort=pushed&per_page=${limit}&type=all`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const repos: GitHubRepo[] = await response.json()
    return repos.map((r) => r.full_name)
  } catch (error) {
    console.error('Failed to fetch repos:', error)
    return []
  }
}

async function analyzeInBackground(
  userId: string,
  repoFullName: string,
  token: string
): Promise<void> {
  const [owner, repo] = repoFullName.split('/')

  try {
    // 분석 시작 상태 설정
    startAnalysis(repoFullName)
    updateProgress(repoFullName, 10)

    // 1. 레포 트리 가져오기
    const treeData = await fetchRepoTree(owner, repo, token)
    updateProgress(repoFullName, 30)

    // 2. 코드 파일 필터링
    const codeFiles = filterCodeFiles(treeData.tree)
    updateProgress(repoFullName, 40)

    if (codeFiles.length === 0) {
      // 분석할 파일 없음 - 빈 결과 캐시
      const emptyResult: AstAnalysisResult = {
        files: [],
        stats: {
          totalFiles: 0,
          totalFunctions: 0,
          totalClasses: 0,
          analysisTimeMs: 0,
          byLayer: { ui: 0, logic: 0, api: 0, data: 0, lib: 0, unknown: 0 },
        },
      }
      await setCachedAnalysis(userId, repoFullName, emptyResult)
      completeAnalysis(repoFullName)
      return
    }

    // 3. 파일 내용 가져오기
    const filesWithContent = await fetchFileContents(owner, repo, codeFiles, token)
    updateProgress(repoFullName, 70)

    // 4. AST 분석 실행
    const analysisResult = analyzeMultipleFiles(filesWithContent)
    updateProgress(repoFullName, 90)

    // 5. 캐시 저장
    await setCachedAnalysis(userId, repoFullName, analysisResult)
    updateProgress(repoFullName, 100)
    completeAnalysis(repoFullName)
  } catch (error) {
    console.error(`Analysis failed for ${repoFullName}:`, error)
    failAnalysis(repoFullName, String(error))
  }
}

async function fetchRepoTree(
  owner: string,
  repo: string,
  token: string
): Promise<{ tree: GitHubTreeItem[] }> {
  const branches = ['main', 'master']

  for (const branch of branches) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
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

  throw new Error(`Failed to fetch tree for ${owner}/${repo}`)
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

      // src/ 또는 pages/ 또는 app/ 하위만
      return (
        item.path.startsWith('src/') ||
        item.path.startsWith('pages/') ||
        item.path.startsWith('app/')
      )
    })
    .slice(0, CONFIG.MAX_FILES_PER_REPO)
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
// GET 핸들러 (상태 확인용)
// ============================================================

export async function GET() {
  return NextResponse.json({
    name: 'Analysis Trigger API',
    version: '1.0.0',
    description: '백그라운드 분석 트리거 API (PRD-0007)',
    usage: {
      method: 'POST',
      body: {
        repos: "['owner/repo'] (선택, 없으면 최근 활동 상위 10개)",
      },
    },
  })
}
