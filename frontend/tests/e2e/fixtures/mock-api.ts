/**
 * E2E 테스트용 API Mock Fixtures
 * 인증 없이 테스트 가능하도록 API 응답을 mock
 */

import { Page } from '@playwright/test'

// Mock 이슈 데이터
export const MOCK_ISSUES = {
  issues: [
    {
      id: 1,
      number: 1,
      title: '테스트 이슈 #1',
      state: 'open',
      labels: [{ name: 'bug' }],
    },
    {
      id: 2,
      number: 2,
      title: '테스트 이슈 #2',
      state: 'open',
      labels: [{ name: 'enhancement' }],
    },
    {
      id: 3,
      number: 3,
      title: '닫힌 이슈 #3',
      state: 'closed',
      labels: [],
    },
  ],
}

// Mock AI 모델 목록
export const MOCK_MODELS = {
  models: [
    { id: 'claude', name: 'Claude Sonnet', description: 'Anthropic Claude', available: true },
    { id: 'codex', name: 'GPT Codex', description: 'OpenAI GPT', available: true },
    { id: 'gemini', name: 'Gemini Pro', description: 'Google Gemini', available: true },
    { id: 'qwen', name: 'Qwen', description: 'Alibaba Qwen', available: true },
  ],
}

// Mock AI 해결 결과
export const MOCK_AI_RESOLVE = {
  success: true,
  model_used: 'claude',
  code: '- old code\n+ new code (mock)',
  output: 'Mock AI resolution completed successfully',
}

/**
 * 이슈 관련 API mock 설정
 */
export async function mockIssuesAPI(page: Page) {
  // 정규식 패턴으로 /api/issues 요청 가로채기
  await page.route(/\/api\/issues/, async (route) => {
    console.log('[MOCK] Intercepted issues API:', route.request().url())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ISSUES),
    })
  })
}

/**
 * AI 모델 목록 API mock 설정
 */
export async function mockModelsAPI(page: Page) {
  await page.route('**/api/models**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_MODELS),
    })
  })
}

/**
 * AI 해결 API mock 설정
 */
export async function mockAIResolveAPI(page: Page, modelOverride?: string) {
  await page.route('**/api/ai/resolve**', async (route) => {
    // 요청에서 모델 정보 추출
    const request = route.request()
    let modelUsed = modelOverride || 'claude'

    try {
      const postData = request.postDataJSON()
      if (postData?.model) {
        modelUsed = postData.model
      }
    } catch {
      // POST data 파싱 실패 시 기본값 사용
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...MOCK_AI_RESOLVE,
        model_used: modelUsed,
      }),
    })
  })
}

/**
 * 모든 테스트용 API mock 설정
 */
export async function setupAllMocks(page: Page) {
  await mockIssuesAPI(page)
  await mockModelsAPI(page)
  await mockAIResolveAPI(page)
}
