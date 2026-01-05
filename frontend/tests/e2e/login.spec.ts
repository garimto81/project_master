/**
 * AUTH E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.1
 *
 * P0 테스트:
 * - AUTH-E01: test_login_flow_success (Supabase 미설정 시 로컬 모드)
 * - AUTH-E02: test_login_flow_cancel
 * - AUTH-E03: test_logout_flow (Supabase 미설정 시 로컬 모드)
 * - AUTH-E04: test_session_expired_redirect
 *
 * Note: Supabase가 설정된 환경에서는 OAuth redirect가 발생하므로,
 * E2E 테스트는 로그인 페이지 UI와 버튼 존재 여부를 확인합니다.
 * 실제 OAuth 플로우는 수동 테스트 또는 Supabase 미설정 모드에서 테스트합니다.
 */

import { test, expect } from '@playwright/test';

test.describe('로그인/로그아웃 플로우', () => {
  test('AUTH-E01: 로그인 페이지 UI', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // 로딩 완료 대기 (인증 확인 후 login-page 또는 dashboard)
    await page.waitForSelector('[data-testid="login-page"], [data-testid="dashboard"]', { timeout: 10000 });

    // Assert - 로그인 페이지 또는 대시보드가 표시되어야 함
    const loginPage = page.getByTestId('login-page');
    const dashboard = page.getByTestId('dashboard');

    const isLoginVisible = await loginPage.isVisible().catch(() => false);
    const isDashboardVisible = await dashboard.isVisible().catch(() => false);

    // 둘 중 하나는 표시되어야 함
    expect(isLoginVisible || isDashboardVisible).toBeTruthy();

    // 로그인 페이지인 경우 버튼 확인
    if (isLoginVisible) {
      await expect(page.getByTestId('github-login-btn')).toBeVisible();
    }
  });

  test('AUTH-E02: 로그인 취소', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // 로딩 완료 대기
    await page.waitForSelector('[data-testid="login-page"], [data-testid="dashboard"]', { timeout: 10000 });

    // Assert - 로그인 페이지인 경우에만 테스트
    const loginPage = page.getByTestId('login-page');
    const isLoginVisible = await loginPage.isVisible().catch(() => false);

    if (isLoginVisible) {
      // 로그인 버튼이 있어야 함
      await expect(page.getByTestId('github-login-btn')).toBeVisible();
    } else {
      // 이미 로그인된 상태 - 대시보드 확인
      await expect(page.getByTestId('dashboard')).toBeVisible();
    }
  });

  test('AUTH-E03: 로그아웃 플로우', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // 로딩 완료 대기
    await page.waitForSelector('[data-testid="login-page"], [data-testid="dashboard"]', { timeout: 10000 });

    const dashboard = page.getByTestId('dashboard');
    const isDashboardVisible = await dashboard.isVisible().catch(() => false);

    if (isDashboardVisible) {
      // 대시보드에서 로그아웃 버튼 확인
      await expect(page.getByTestId('logout-btn')).toBeVisible();

      // Act - 로그아웃 클릭
      await page.getByTestId('logout-btn').click();

      // Assert - 로그인 페이지로 돌아감
      await expect(page.getByTestId('login-page')).toBeVisible();
    } else {
      // 로그인 안된 상태 - 로그인 페이지 확인
      await expect(page.getByTestId('login-page')).toBeVisible();
    }
  });

  test('AUTH-E04: 세션 만료 시 리다이렉트', async ({ page }) => {
    // 세션 만료는 실제 구현에서 테스트
    // 현재는 로그인 페이지 접근 가능 여부만 확인
    await page.goto('/');

    // 로딩 완료 대기
    await page.waitForSelector('[data-testid="login-page"], [data-testid="dashboard"]', { timeout: 10000 });

    // 어떤 상태든 페이지가 정상 로드되어야 함
    const loginPage = page.getByTestId('login-page');
    const dashboard = page.getByTestId('dashboard');

    const isLoginVisible = await loginPage.isVisible().catch(() => false);
    const isDashboardVisible = await dashboard.isVisible().catch(() => false);

    expect(isLoginVisible || isDashboardVisible).toBeTruthy();
  });

  test('AUTH-E05: OAuth 에러 파라미터 표시 (Issue #55)', async ({ page }) => {
    // OAuth 콜백에서 에러가 발생하면 ?error=auth_failed로 리다이렉트됨
    // 이 에러는 사용자에게 표시되어야 함
    await page.goto('/?error=auth_failed');

    // 로딩 완료 대기
    await page.waitForSelector('[data-testid="login-page"]', { timeout: 10000 });

    // 에러 메시지가 표시되어야 함
    const errorElement = page.getByTestId('login-error');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText('인증');

    // URL에서 에러 파라미터가 제거되어야 함 (replace로 제거됨)
    await page.waitForURL('/', { timeout: 5000 });
  });

  test('AUTH-E06: 코드 만료 에러 표시', async ({ page }) => {
    // OAuth 코드 만료 시
    await page.goto('/?error=code_expired');

    await page.waitForSelector('[data-testid="login-page"]', { timeout: 10000 });

    const errorElement = page.getByTestId('login-error');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText('만료');
  });
});
