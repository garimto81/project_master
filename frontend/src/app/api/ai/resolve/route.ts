/**
 * AI Resolve Issue API
 * POST /api/ai/resolve - AI로 이슈 해결
 *
 * FastAPI backend/src/main.py의 resolve_issue_with_ai 함수를 마이그레이션
 * Claude, GPT-4o, Gemini 등 여러 AI 모델 지원
 */

import { NextRequest, NextResponse } from 'next/server'

interface AIResolveRequest {
  model: string
  issue_id: number
  issue_title: string
  prompt?: string
}

// AI 모델별 API 호출
async function callAI(model: string, prompt: string): Promise<{ code: string; output: string }> {
  switch (model.toLowerCase()) {
    case 'claude':
      return callClaude(prompt)
    case 'gpt-4o':
    case 'gpt4':
    case 'openai':
      return callOpenAI(prompt)
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

export async function POST(request: NextRequest) {
  try {
    const body: AIResolveRequest = await request.json()
    const { model, issue_id, issue_title, prompt } = body

    if (!model || !issue_id || !issue_title) {
      return NextResponse.json(
        { error: 'model, issue_id, issue_title은 필수입니다' },
        { status: 400 }
      )
    }

    // 프롬프트 구성
    const fullPrompt = prompt
      ? `이슈 #${issue_id}: ${issue_title}\n\n사용자 지시: ${prompt}`
      : `이슈 #${issue_id}: ${issue_title}\n\n이 이슈를 해결하는 코드를 작성해주세요.`

    // AI 호출
    const { code, output } = await callAI(model, fullPrompt)

    return NextResponse.json({
      success: true,
      model_used: model,
      code,
      output,
      message: `${model}로 이슈 #${issue_id} 해결 완료`,
    })
  } catch (error) {
    console.error('AI resolve API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI 호출 실패',
      },
      { status: 500 }
    )
  }
}
