/**
 * Available AI Models API
 * GET /api/models - 사용 가능한 AI 모델 목록
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY
  const hasGoogleKey = !!process.env.GOOGLE_API_KEY
  const hasDashScopeKey = !!process.env.DASHSCOPE_API_KEY

  const models = [
    {
      id: 'claude',
      name: 'Claude Sonnet',
      description: 'Anthropic Claude - 복잡한 코드 분석 및 생성',
      available: hasAnthropicKey,
      webUrl: 'https://claude.ai/new',
      mode: hasAnthropicKey ? 'auto' : 'redirect',
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'OpenAI GPT-4o - 범용 코드 생성',
      available: hasOpenAIKey,
      webUrl: 'https://chatgpt.com/',
      mode: hasOpenAIKey ? 'auto' : 'redirect',
    },
    {
      id: 'gemini',
      name: 'Gemini 1.5 Flash',
      description: 'Google Gemini - 빠른 응답, 다국어 지원',
      available: hasGoogleKey,
      webUrl: 'https://gemini.google.com/',
      mode: hasGoogleKey ? 'auto' : 'redirect',
    },
    {
      id: 'qwen',
      name: 'Qwen Plus',
      description: 'Alibaba Qwen - 중국어/영어 코드 생성',
      available: hasDashScopeKey,
      webUrl: 'https://tongyi.aliyun.com/qianwen/',
      mode: hasDashScopeKey ? 'auto' : 'redirect',
    },
  ]

  return NextResponse.json({ models })
}
