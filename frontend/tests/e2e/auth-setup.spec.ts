/**
 * OAuth 인증 상태 저장 스크립트
 *
 * 사용법 1 (수동 로그인):
 *   npx playwright test tests/e2e/auth-setup.spec.ts --headed
 *   브라우저에서 GitHub 로그인 완료 (2분 대기)
 *
 * 사용법 2 (자동 로그인 - 환경변수 필요):
 *   GITHUB_TEST_USER=your_username GITHUB_TEST_PASS=your_password npx playwright test tests/e2e/auth-setup.spec.ts --headed
 *
 * 인증 상태가 .auth/user.json에 저장됨
 */

import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../../.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Vercel 배포 URL 사용
  const baseUrl = process.env.TEST_BASE_URL || 'https://frontend-xi-seven.vercel.app'

  // GitHub 자격 증명 (환경변수에서)
  const githubUser = process.env.GITHUB_TEST_USER
  const githubPass = process.env.GITHUB_TEST_PASS

  // 1. 로그인 페이지로 이동
  await page.goto(baseUrl)

  // 2. 로그인 페이지 확인
  await page.waitForSelector('[data-testid="login-page"], [data-testid="dashboard"]', {
    timeout: 15000
  })

  // 이미 로그인되어 있으면 저장하고 종료
  const dashboard = await page.$('[data-testid="dashboard"]')
  if (dashboard) {
    console.log('✅ Already logged in, saving state...')
    await page.context().storageState({ path: authFile })
    return
  }

  // 3. GitHub 로그인 버튼 클릭
  console.log('🔐 Clicking GitHub login button...')
  await page.click('[data-testid="github-login-btn"]')

  // 4. GitHub 로그인 페이지 대기
  await page.waitForURL(/github\.com/, { timeout: 15000 })

  // 5. 자동 또는 수동 로그인
  if (githubUser && githubPass) {
    console.log('🤖 Auto-login with environment credentials...')

    // GitHub 로그인 폼 입력
    await page.fill('input[name="login"]', githubUser)
    await page.fill('input[name="password"]', githubPass)
    await page.click('input[type="submit"]')

    // 2FA가 있으면 수동 입력 대기
    const has2FA = await page.$('input[name="otp"]')
    if (has2FA) {
      console.log('⏳ 2FA detected - please enter code manually (60s)...')
      await page.waitForURL(/frontend-xi-seven\.vercel\.app/, { timeout: 60000 })
    }

    // 권한 승인 페이지가 있으면 클릭
    const authorizeBtn = await page.$('button[name="authorize"]')
    if (authorizeBtn) {
      await authorizeBtn.click()
    }
  } else {
    console.log('⏳ Please complete GitHub login manually...')
    console.log('   You have 2 minutes to login.')
  }

  // 6. 대시보드로 리다이렉트 대기 (최대 2분)
  await page.waitForSelector('[data-testid="dashboard"]', {
    timeout: 120000
  })

  console.log('✅ Login successful!')

  // 7. 인증 상태 저장
  await page.context().storageState({ path: authFile })
  console.log(`✅ Auth state saved to ${authFile}`)
})
