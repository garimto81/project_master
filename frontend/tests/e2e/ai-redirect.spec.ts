/**
 * AI 리다이렉트 모달 E2E 테스트
 * 비개발자를 위한 AI 웹사이트 연동 테스트
 */

import { test, expect } from '@playwright/test'

test.describe('AI 리다이렉트 모드', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 모드로 프로젝트 페이지 접속
    await page.goto('/project?repo=test/repo&test=true&redirect=true')
    await page.waitForSelector('[data-testid="project-page"]')
  })

  test('AR-E01: 이슈 선택 후 AI로 해결 버튼 클릭 시 리다이렉트 모달 표시', async ({ page }) => {
    // 이슈 선택
    await page.click('[data-testid="issue-1"]')
    await page.waitForSelector('[data-testid="issue-detail"]')

    // AI로 해결 버튼 클릭
    await page.click('[data-testid="ai-resolve-btn"]')

    // 리다이렉트 모달 표시 확인
    await expect(page.locator('[data-testid="ai-redirect-modal"]')).toBeVisible()
  })

  test('AR-E02: 프롬프트 미리보기 표시', async ({ page }) => {
    // 이슈 선택 및 AI 해결 클릭
    await page.click('[data-testid="issue-1"]')
    await page.click('[data-testid="ai-resolve-btn"]')

    // 프롬프트 미리보기 확인
    const promptPreview = page.locator('[data-testid="prompt-preview"]')
    await expect(promptPreview).toBeVisible()
    await expect(promptPreview).toContainText('이슈 해결 요청')
    await expect(promptPreview).toContainText('#1')
  })

  test('AR-E03: 클립보드에 복사 버튼 동작', async ({ page, context }) => {
    // 클립보드 권한 부여
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // 이슈 선택 및 AI 해결 클릭
    await page.click('[data-testid="issue-1"]')
    await page.click('[data-testid="ai-resolve-btn"]')

    // 복사 버튼 클릭
    await page.click('[data-testid="copy-prompt-btn"]')

    // 버튼 텍스트가 "복사됨!"으로 변경되는지 확인
    await expect(page.locator('[data-testid="copy-prompt-btn"]')).toContainText('복사됨!')
  })

  test('AR-E04: AI 서비스 열기 버튼 표시', async ({ page }) => {
    // 이슈 선택 및 AI 해결 클릭
    await page.click('[data-testid="issue-1"]')
    await page.click('[data-testid="ai-resolve-btn"]')

    // Claude 열기 버튼 확인 (기본 모델)
    const openButton = page.locator('[data-testid="open-claude-btn"]')
    await expect(openButton).toBeVisible()
    await expect(openButton).toContainText('Claude 열기')
  })

  test('AR-E05: AI 열기 후 다음 버튼 활성화', async ({ page }) => {
    // 이슈 선택 및 AI 해결 클릭
    await page.click('[data-testid="issue-1"]')
    await page.click('[data-testid="ai-resolve-btn"]')

    // AI 열기 버튼 클릭 (새 탭 열림 - 테스트에서는 차단됨)
    await page.click('[data-testid="open-claude-btn"]')

    // "다음" 버튼 활성화 확인
    const nextButton = page.getByText('다음: 응답 붙여넣기')
    await expect(nextButton).toBeEnabled()
  })

  test('AR-E06: 응답 붙여넣기 단계 전환', async ({ page }) => {
    // 이슈 선택 및 AI 해결 클릭
    await page.click('[data-testid="issue-1"]')
    await page.click('[data-testid="ai-resolve-btn"]')

    // AI 열기 → 다음 클릭
    await page.click('[data-testid="open-claude-btn"]')
    await page.click('text=다음: 응답 붙여넣기')

    // 응답 입력 textarea 표시 확인
    await expect(page.locator('[data-testid="response-textarea"]')).toBeVisible()
  })

  test('AR-E07: 응답 붙여넣기 및 코드 추출', async ({ page }) => {
    // 이슈 선택 및 모달 열기
    await page.click('[data-testid="issue-1"]')
    await page.click('[data-testid="ai-resolve-btn"]')

    // 단계 2로 이동
    await page.click('[data-testid="open-claude-btn"]')
    await page.click('text=다음: 응답 붙여넣기')

    // 코드가 포함된 응답 붙여넣기
    const mockResponse = `여기 수정된 코드입니다:

\`\`\`typescript
function fixedFunction() {
  return 'fixed'
}
\`\`\`

이렇게 수정하면 됩니다.`

    await page.fill('[data-testid="response-textarea"]', mockResponse)

    // 코드 추출 버튼 클릭
    await page.click('[data-testid="extract-code-btn"]')

    // 추출된 코드 미리보기 표시 확인
    await expect(page.locator('[data-testid="extracted-code-preview"]')).toBeVisible()
    await expect(page.locator('[data-testid="extracted-code-preview"]')).toContainText('fixedFunction')
  })

  test('AR-E08: 코드 없는 응답 시 경고 표시', async ({ page }) => {
    // 이슈 선택 및 모달 열기
    await page.click('[data-testid="issue-1"]')
    await page.click('[data-testid="ai-resolve-btn"]')

    // 단계 2로 이동
    await page.click('[data-testid="open-claude-btn"]')
    await page.click('text=다음: 응답 붙여넣기')

    // 코드 블록 없는 응답 붙여넣기
    await page.fill('[data-testid="response-textarea"]', '이것은 코드가 없는 일반 텍스트입니다.')

    // 코드 추출 버튼 클릭
    await page.click('[data-testid="extract-code-btn"]')

    // 경고 메시지 확인
    await expect(page.getByText('코드 블록을 찾을 수 없습니다')).toBeVisible()
  })

  test('AR-E09: 모달 닫기', async ({ page }) => {
    // 이슈 선택 및 AI 해결 클릭
    await page.click('[data-testid="issue-1"]')
    await page.click('[data-testid="ai-resolve-btn"]')

    // 모달 표시 확인
    await expect(page.locator('[data-testid="ai-redirect-modal"]')).toBeVisible()

    // X 버튼 클릭으로 닫기
    await page.click('[data-testid="ai-redirect-modal"] button:has-text("×")')

    // 모달 닫힘 확인
    await expect(page.locator('[data-testid="ai-redirect-modal"]')).not.toBeVisible()
  })

  test('AR-E10: 모델 변경 후 리다이렉트', async ({ page }) => {
    // 이슈 선택
    await page.click('[data-testid="issue-1"]')
    await page.waitForSelector('[data-testid="issue-detail"]')

    // Gemini 모델 선택
    await page.selectOption('[data-testid="model-selector"]', 'gemini')

    // AI로 해결 클릭
    await page.click('[data-testid="ai-resolve-btn"]')

    // 모달 표시 확인
    await expect(page.locator('[data-testid="ai-redirect-modal"]')).toBeVisible()

    // Gemini 열기 버튼 확인
    await expect(page.locator('[data-testid="open-gemini-btn"]')).toBeVisible()
  })
})
