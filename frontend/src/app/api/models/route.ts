/**
 * Available AI Models API
 * GET /api/models - 사용 가능한 AI 모델 목록
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const models = [
    {
      id: 'claude',
      name: 'Claude Sonnet',
      description: 'Anthropic Claude - 복잡한 코드 분석 및 생성',
      available: !!process.env.ANTHROPIC_API_KEY,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'OpenAI GPT-4o - 범용 코드 생성',
      available: !!process.env.OPENAI_API_KEY,
    },
    {
      id: 'gemini',
      name: 'Gemini Pro',
      description: 'Google Gemini - 다국어 지원',
      available: !!process.env.GOOGLE_API_KEY,
    },
  ]

  return NextResponse.json({ models })
}
