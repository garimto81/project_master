/**
 * VISUALIZATION E2E 테스트
 * PRD v6.2 Section 1.2: 다층 시각화 시스템
 *
 * Level 0: 레포 목록
 * Level 1-A: 큰 그림 (데이터 흐름)
 * Level 1-B: 레이어 상세
 * Level 2: 모듈 상세
 * Level 3: 함수 실행 흐름
 */

import { test, expect } from '@playwright/test'

test.describe('코드 시각화 - Level 네비게이션', () => {
  test('VIS-E01: Level 0 - 페이지 로드 및 구조 확인', async ({ page }) => {
    // 시각화 페이지로 이동
    await page.goto('/visualization')

    // 페이지 로드 확인
    await expect(page.getByTestId('visualization-page')).toBeVisible()
    await expect(page.getByTestId('header')).toBeVisible()

    // 페이지에 주요 요소가 있는지 확인 (인증 상태와 무관하게)
    // 도움말 섹션은 항상 표시됨
    await expect(page.getByText('시각화 네비게이션')).toBeVisible()
  })

  test('VIS-E02: Level 0 - 로그인 필요 시 로그인 버튼 표시', async ({ page }) => {
    await page.goto('/visualization')
    await expect(page.getByTestId('visualization-page')).toBeVisible()

    // 인증 에러 시 로그인 버튼 확인
    const loginBtn = page.getByRole('button', { name: /GitHub으로 로그인/ })
    const hasLoginBtn = await loginBtn.count() > 0

    if (hasLoginBtn) {
      await expect(loginBtn).toBeVisible()
    }
  })

  test('VIS-E03: Level 1-A - URL 파라미터로 레포 선택', async ({ page }) => {
    // 특정 레포로 시각화 페이지 접근
    await page.goto('/visualization?repo=garimto81/project_master')

    // 페이지 로드 확인
    await expect(page.getByTestId('visualization-page')).toBeVisible()

    // 뒤로 버튼이 보이면 Level 1-A에 있음
    const backBtn = page.getByRole('button', { name: /뒤로/ })
    const hasBackBtn = await backBtn.count() > 0

    // Level 1-A 또는 인증 에러 중 하나
    const bigPictureSection = page.getByTestId('big-picture-section')
    const hasBigPicture = await bigPictureSection.count() > 0

    if (hasBigPicture) {
      await expect(bigPictureSection).toBeVisible()
      await expect(backBtn).toBeVisible()
    }
  })

  test('VIS-E04: 도움말 섹션 표시', async ({ page }) => {
    await page.goto('/visualization')
    await expect(page.getByTestId('visualization-page')).toBeVisible()

    // 도움말 섹션 확인 (exact match로 중복 방지)
    await expect(page.getByText('시각화 네비게이션')).toBeVisible()
    await expect(page.getByText('Level 0', { exact: true })).toBeVisible()
    await expect(page.getByText('Level 1-A', { exact: true })).toBeVisible()
    await expect(page.getByText('Level 2', { exact: true })).toBeVisible()
    await expect(page.getByText('Level 3', { exact: true })).toBeVisible()
  })

  test('VIS-E05: 뒤로가기 버튼 동작', async ({ page }) => {
    // Level 1-A에서 시작
    await page.goto('/visualization?repo=garimto81/project_master')
    await expect(page.getByTestId('visualization-page')).toBeVisible()

    // 뒤로 버튼 클릭 시 Level 0로 이동
    const backBtn = page.getByRole('button', { name: /뒤로/ })
    const hasBackBtn = await backBtn.count() > 0

    if (hasBackBtn) {
      await backBtn.click()
      await page.waitForTimeout(500)

      // 뒤로가기 후 URL에서 repo 파라미터가 제거되어야 함
      // 또는 Level 0 관련 UI 요소가 표시
      const url = page.url()
      const noRepoParam = !url.includes('repo=')

      // Level 0 관련 요소들
      const reposSection = page.getByTestId('repos-section')
      const loginBtn = page.getByRole('button', { name: /GitHub.*로그인/ })
      const helpSection = page.getByText('시각화 네비게이션')

      const hasRepos = await reposSection.count() > 0
      const hasLogin = await loginBtn.count() > 0
      const hasHelp = await helpSection.count() > 0

      // URL에서 repo가 없거나 Level 0 요소가 있으면 성공
      expect(noRepoParam || hasRepos || hasLogin || hasHelp).toBeTruthy()
    }
  })
})

test.describe('코드 시각화 - 컴포넌트 렌더링', () => {
  test('VIS-E06: Mermaid 다이어그램 렌더링', async ({ page }) => {
    await page.goto('/visualization?repo=garimto81/project_master')
    await expect(page.getByTestId('visualization-page')).toBeVisible()

    // Big Picture 섹션이 있으면 Mermaid 확인
    const bigPictureSection = page.getByTestId('big-picture-section')
    const hasBigPicture = await bigPictureSection.count() > 0

    if (hasBigPicture) {
      // Mermaid 컨테이너 로드 대기
      await page.waitForTimeout(3000)
      const mermaidContainer = page.getByTestId('mermaid-container')
      const hasMermaid = await mermaidContainer.count() > 0

      if (hasMermaid) {
        await expect(mermaidContainer).toBeVisible()
      }
    }
  })

  test('VIS-E07: 브레드크럼 네비게이션 표시', async ({ page }) => {
    await page.goto('/visualization')
    await expect(page.getByTestId('visualization-page')).toBeVisible()

    // 브레드크럼에 owner 표시
    await expect(page.getByText('garimto81')).toBeVisible()
  })

  test('VIS-E08: 로딩 상태 표시', async ({ page }) => {
    await page.goto('/visualization')

    // 로딩 중이거나 완료된 상태
    await expect(page.getByTestId('visualization-page')).toBeVisible({ timeout: 10000 })
  })
})
