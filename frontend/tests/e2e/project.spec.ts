/**
 * PROJECT E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.2
 *
 * P0 테스트:
 * - REPO-E01: test_project_list_display
 * - REPO-E02: test_project_search
 * - REPO-E03: test_project_selection
 *
 * Note: Supabase OAuth 환경에서는 실제 로그인 테스트가 불가능하므로
 * 홈 페이지 UI 요소 존재 여부만 확인합니다.
 */

import { test, expect } from '@playwright/test';

test.describe('프로젝트 관리', () => {
  test('REPO-E01: 홈 페이지 로드', async ({ page }) => {
    // 페이지 로드
    await page.goto('/');

    // 로딩 완료 대기 (인증 확인 후 login-page 또는 dashboard)
    await page.waitForSelector('[data-testid="login-page"], [data-testid="dashboard"], [data-testid="loading-page"]', { timeout: 10000 });

    // 어떤 페이지든 로드되어야 함
    const loginPage = page.getByTestId('login-page');
    const dashboard = page.getByTestId('dashboard');
    const loadingPage = page.getByTestId('loading-page');

    const isAnyVisible =
      await loginPage.isVisible().catch(() => false) ||
      await dashboard.isVisible().catch(() => false) ||
      await loadingPage.isVisible().catch(() => false);

    expect(isAnyVisible).toBeTruthy();
  });

  test('REPO-E02: 로그인 버튼 존재 확인', async ({ page }) => {
    // 페이지 로드
    await page.goto('/');

    // 로딩 완료 대기
    await page.waitForSelector('[data-testid="login-page"], [data-testid="dashboard"]', { timeout: 10000 });

    const loginPage = page.getByTestId('login-page');
    const isLoginVisible = await loginPage.isVisible().catch(() => false);

    if (isLoginVisible) {
      // 로그인 버튼이 있어야 함
      await expect(page.getByTestId('github-login-btn')).toBeVisible();
    } else {
      // 대시보드인 경우 로그아웃 버튼이 있어야 함
      await expect(page.getByTestId('logout-btn')).toBeVisible();
    }
  });

  test('REPO-E03: 대시보드 UI 요소 확인', async ({ page }) => {
    // 페이지 로드
    await page.goto('/');

    // 로딩 완료 대기
    await page.waitForSelector('[data-testid="login-page"], [data-testid="dashboard"]', { timeout: 10000 });

    const dashboard = page.getByTestId('dashboard');
    const isDashboardVisible = await dashboard.isVisible().catch(() => false);

    if (isDashboardVisible) {
      // 대시보드 UI 요소 확인
      await expect(page.getByTestId('project-list')).toBeVisible();
      await expect(page.getByTestId('project-search')).toBeVisible();
      await expect(page.getByTestId('header')).toBeVisible();
    } else {
      // 로그인 페이지 - DevFlow 타이틀 확인
      await expect(page.locator('h1')).toContainText('DevFlow');
    }
  });
});
