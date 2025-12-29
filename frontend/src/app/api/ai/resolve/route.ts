/**
 * AI Resolve Issue API (SSE Streaming)
 * POST /api/ai/resolve - AI로 이슈 해결 (SSE 스트리밍)
 *
 * PRD: 0006-prd-ai-auto-mode.md
 *
 * SSE Response Events:
 * - { type: 'progress', stage: 'analyzing' | 'generating' | 'ready', percent: number }
 * - { type: 'chunk', content: string }
 * - { type: 'complete', code: string, output: string, resolveId: string }
 * - { type: 'error', message: string }
 */

import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

interface AIResolveRequest {
  model: string
  issue_id: number
  issue_title: string
  issue_body?: string
  prompt?: string
}

// 진행 중인 resolve 세션 저장 (메모리 캐시)
const resolveCache = new Map<string, { code: string; output: string; status: 'pending' | 'approved' | 'rejected' }>()

// 캐시 정리 (30분 후 자동 삭제)
function scheduleCleanup(resolveId: string) {
  setTimeout(() => {
    resolveCache.delete(resolveId)
  }, 30 * 60 * 1000)
}

// SSE 이벤트 포맷
function formatSSE(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// AI 모델별 API 호출
async function callAI(model: string, prompt: string): Promise<{ code: string; output: string }> {
  switch (model.toLowerCase()) {
    case 'claude':
      return callClaude(prompt)
    case 'gpt-4o':
    case 'gpt4':
    case 'openai':
    case 'codex':
      return callOpenAI(prompt)
    case 'gemini':
      return callGemini(prompt)
    case 'qwen':
      return callQwen(prompt)
    default:
      throw new Error(`지원하지 않는 모델: ${model}`)
  }
}

// Claude API 호출
async function callClaude(prompt: string): Promise<{ code: string; output: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API 오류: ${error}`)
  }

  const data = await response.json()
  const content = data.content[0]?.text || ''

  // 코드 블록 추출
  const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/)
  const code = codeMatch ? codeMatch[1].trim() : ''

  return {
    code,
    output: content,
  }
}

// OpenAI API 호출
async function callOpenAI(prompt: string): Promise<{ code: string; output: string }> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API 오류: ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''

  // 코드 블록 추출
  const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/)
  const code = codeMatch ? codeMatch[1].trim() : ''

  return {
    code,
    output: content,
  }
}

// Google Gemini API 호출
async function callGemini(prompt: string): Promise<{ code: string; output: string }> {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API 오류: ${error}`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // 코드 블록 추출
  const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/)
  const code = codeMatch ? codeMatch[1].trim() : ''

  return {
    code,
    output: content,
  }
}

// Alibaba Qwen API 호출 (DashScope)
async function callQwen(prompt: string): Promise<{ code: string; output: string }> {
  const apiKey = process.env.DASHSCOPE_API_KEY

  if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY가 설정되지 않았습니다')
  }

  const response = await fetch(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 4096,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Qwen API 오류: ${error}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  // 코드 블록 추출
  const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/)
  const code = codeMatch ? codeMatch[1].trim() : ''

  return {
    code,
    output: content,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AIResolveRequest = await request.json()
    const { model, issue_id, issue_title, issue_body, prompt } = body

    if (!model || !issue_id || !issue_title) {
      return new Response(
        JSON.stringify({ error: 'model, issue_id, issue_title은 필수입니다' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // resolveId 생성
    const resolveId = randomUUID()

    // SSE 스트림 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          // Stage 1: Analyzing (20%)
          controller.enqueue(encoder.encode(formatSSE('message', {
            type: 'progress',
            stage: 'analyzing',
            percent: 20,
            message: '이슈 분석 중...'
          })))
          await delay(300)

          // Stage 2: Context (40%)
          controller.enqueue(encoder.encode(formatSSE('message', {
            type: 'progress',
            stage: 'context',
            percent: 40,
            message: '컨텍스트 수집 중...'
          })))
          await delay(200)

          // 프롬프트 구성
          const fullPrompt = prompt
            ? `이슈 #${issue_id}: ${issue_title}\n\n${issue_body ? `설명: ${issue_body}\n\n` : ''}사용자 지시: ${prompt}`
            : `이슈 #${issue_id}: ${issue_title}\n\n${issue_body ? `설명: ${issue_body}\n\n` : ''}이 이슈를 해결하는 코드를 작성해주세요.`

          // Stage 3: Generating (60%)
          controller.enqueue(encoder.encode(formatSSE('message', {
            type: 'progress',
            stage: 'generating',
            percent: 60,
            message: '코드 생성 중...'
          })))

          // AI 호출 (스트리밍 또는 일반)
          let code = ''
          let output = ''

          const isMockMode = process.env.MOCK_AI_API === 'true'

          if (isMockMode) {
            // Mock 모드: 스트리밍 시뮬레이션
            const chunks = [
              '// Mock generated code for issue #' + issue_id + '\n',
              'function solve() {\n',
              '  // This is a mock solution\n',
              '  return "issue resolved";\n',
              '}\n'
            ]

            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(formatSSE('message', {
                type: 'chunk',
                content: chunk
              })))
              code += chunk
              await delay(100)
            }

            output = `Mock AI response for ${model}:\n\n\`\`\`javascript\n${code}\`\`\`\n\nThis is a mock response for testing purposes.`
          } else {
            // 실제 AI 호출
            const result = await callAI(model, fullPrompt)
            code = result.code
            output = result.output

            // 코드 청크로 전송
            const codeChunks = code.match(/.{1,50}/g) || []
            for (const chunk of codeChunks) {
              controller.enqueue(encoder.encode(formatSSE('message', {
                type: 'chunk',
                content: chunk
              })))
              await delay(20)
            }
          }

          // Stage 4: Finalizing (80%)
          controller.enqueue(encoder.encode(formatSSE('message', {
            type: 'progress',
            stage: 'finalizing',
            percent: 80,
            message: '결과 정리 중...'
          })))
          await delay(200)

          // 결과 캐시에 저장
          resolveCache.set(resolveId, { code, output, status: 'pending' })
          scheduleCleanup(resolveId)

          // Stage 5: Ready (100%)
          controller.enqueue(encoder.encode(formatSSE('message', {
            type: 'progress',
            stage: 'ready',
            percent: 100,
            message: '검토 대기'
          })))

          // Complete 이벤트
          controller.enqueue(encoder.encode(formatSSE('message', {
            type: 'complete',
            code,
            output,
            resolveId,
            model_used: model
          })))

        } catch (error) {
          controller.enqueue(encoder.encode(formatSSE('message', {
            type: 'error',
            message: error instanceof Error ? error.message : 'AI 호출 실패'
          })))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('AI resolve API error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'AI 호출 실패',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
