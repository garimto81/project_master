/**
 * Logic Flow API - LLM 기반 모듈 분석
 * Issues: #61 (모듈 제목), #62 (모듈 설명)
 *
 * Local Ollama (Qwen3) 모델을 사용하여 코드 분석
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import {
  checkOllamaStatus,
  generateModuleTitle,
  generateModuleDescription,
  analyzeFunctionCausality,
  batchAnalyzeModules,
} from '@/lib/ollama-client'

interface AnalyzeRequest {
  repo: string
  files: Array<{
    path: string
    layer: string
  }>
  mode: 'title' | 'description' | 'causality' | 'batch'
}

interface FileContent {
  path: string
  content: string
  layer: string
}

/**
 * GitHub에서 파일 내용 가져오기
 */
async function fetchFileContents(
  token: string,
  owner: string,
  repoName: string,
  files: Array<{ path: string; layer: string }>
): Promise<FileContent[]> {
  const results: FileContent[] = []
  const BATCH_SIZE = 5
  const TIMEOUT = 8000

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map(async (file) => {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
            signal: AbortSignal.timeout(TIMEOUT),
          }
        )

        if (!response.ok) return null

        const data = await response.json()
        if (!data.content) return null

        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        return {
          path: file.path,
          content,
          layer: file.layer,
        }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value)
      }
    }
  }

  return results
}

/**
 * POST: LLM 기반 코드 분석
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { token } = await getGitHubTokenFromSession()
    if (!token) {
      return NextResponse.json(
        { error: 'GitHub 인증이 필요합니다. 로그인해주세요.' },
        { status: 401 }
      )
    }

    // Ollama 상태 확인
    const ollamaStatus = await checkOllamaStatus()
    if (!ollamaStatus.available) {
      return NextResponse.json(
        {
          error: 'Ollama 서버에 연결할 수 없습니다.',
          fallback: true,
          suggestion: 'ollama serve 명령어로 서버를 시작하세요.',
        },
        { status: 503 }
      )
    }

    // 요청 파싱
    const body: AnalyzeRequest = await request.json()
    const { repo, files, mode } = body

    if (!repo || !files || files.length === 0) {
      return NextResponse.json(
        { error: 'repo와 files 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }

    const [owner, repoName] = repo.split('/')

    // 파일 내용 가져오기
    const fileContents = await fetchFileContents(token, owner, repoName, files)

    if (fileContents.length === 0) {
      return NextResponse.json(
        { error: '분석할 파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 모드별 분석 수행
    switch (mode) {
      case 'title': {
        // Issue #61: 모듈 제목 생성
        const results = await Promise.all(
          fileContents.map(async (file) => {
            const fileName = file.path.split('/').pop() || file.path
            const result = await generateModuleTitle(file.content, fileName, file.layer)
            return {
              path: file.path,
              ...result,
            }
          })
        )

        return NextResponse.json({
          mode: 'title',
          results,
          analyzed: results.length,
          ollamaModel: ollamaStatus.models[0] || 'qwen3',
        })
      }

      case 'description': {
        // Issue #62: 모듈 설명 생성
        const results = await Promise.all(
          fileContents.map(async (file) => {
            const fileName = file.path.split('/').pop() || file.path
            const analysis = await generateModuleDescription(
              file.content,
              fileName,
              file.layer
            )
            return {
              path: file.path,
              ...analysis,
            }
          })
        )

        return NextResponse.json({
          mode: 'description',
          results,
          analyzed: results.length,
          ollamaModel: ollamaStatus.models[0] || 'qwen3',
        })
      }

      case 'causality': {
        // Issue #60: 인과관계 분석
        const results = await Promise.all(
          fileContents.map(async (file) => {
            const fileName = file.path.split('/').pop() || file.path
            const analysis = await analyzeFunctionCausality(file.content, fileName)
            return {
              path: file.path,
              fileName,
              ...analysis,
            }
          })
        )

        return NextResponse.json({
          mode: 'causality',
          results,
          analyzed: results.length,
          ollamaModel: ollamaStatus.models[0] || 'qwen3',
        })
      }

      case 'batch': {
        // 배치 분석 (제목 + 설명)
        const modules = fileContents.map((file) => ({
          code: file.content,
          fileName: file.path.split('/').pop() || file.path,
          layer: file.layer,
        }))

        const analysisMap = await batchAnalyzeModules(modules)
        const results = Array.from(analysisMap.entries()).map(([fileName, analysis]) => ({
          fileName,
          ...analysis,
        }))

        return NextResponse.json({
          mode: 'batch',
          results,
          analyzed: results.length,
          ollamaModel: ollamaStatus.models[0] || 'qwen3',
        })
      }

      default:
        return NextResponse.json(
          { error: '지원하지 않는 분석 모드입니다.' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[LLM Analyze] Error:', error)
    return NextResponse.json(
      {
        error: 'LLM 분석 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET: Ollama 상태 확인
 */
export async function GET() {
  const status = await checkOllamaStatus()

  return NextResponse.json({
    ollama: status,
    supported_modes: ['title', 'description', 'causality', 'batch'],
    default_model: process.env.OLLAMA_MODEL || 'qwen3',
  })
}
