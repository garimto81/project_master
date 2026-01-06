/**
 * OAuth 로그인 후 테스트
 *
 * 저장된 인증 상태를 사용하여 로그인된 상태에서 테스트 실행
 *
 * 사전 조건:
 * 1. npx playwright test tests/e2e/auth-setup.ts --headed 실행
 * 2. 브라우저에서 GitHub 로그인 완료
 */

import { test, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../../.auth/user.json')

// 저장된 인증 상태 사용
test.use({ storageState: authFile })

test.describe('로그인된 상태 테스트', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'https://frontend-xi-seven.vercel.app'

  test('OAUTH-01: 대시보드 접근 가능', async ({ page }) => {
    await page.goto(baseUrl)

    // 대시보드가 표시되어야 함
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 15000 })

    // 로그아웃 버튼이 있어야 함
    await expect(page.getByTestId('logout-btn')).toBeVisible()
  })

  test('OAUTH-02: 프로젝트 목록 표시', async ({ page }) => {
    await page.goto(baseUrl)

    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 15000 })

    // 프로젝트 목록 영역 확인
    await expect(page.getByTestId('project-list')).toBeVisible()
  })

  test('OAUTH-03: 프로젝트 선택 후 상세 페이지 이동', async ({ page }) => {
    await page.goto(baseUrl)

    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 15000 })

    // 첫 번째 프로젝트 클릭
    const projectItem = page.getByTestId('project-item').first()

    // 프로젝트가 로드될 때까지 대기
    await projectItem.waitFor({ state: 'visible', timeout: 10000 })
    await projectItem.click()

    // URL이 /project?repo= 형태로 변경되어야 함
    await expect(page).toHaveURL(/\/project\?repo=/, { timeout: 10000 })
  })

  test('OAUTH-04: 로그아웃 후 로그인 페이지로 이동', async ({ page }) => {
    await page.goto(baseUrl)

    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 15000 })

    // 로그아웃 클릭
    await page.getByTestId('logout-btn').click()

    // 로그인 페이지로 이동
    await expect(page.getByTestId('login-page')).toBeVisible({ timeout: 10000 })
  })
})
