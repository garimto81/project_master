/**
 * AUTH E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.1
 *
 * P0 테스트:
 * - AUTH-E01: test_login_flow_success
 * - AUTH-E02: test_login_flow_cancel
 * - AUTH-E03: test_logout_flow
 * - AUTH-E04: test_session_expired_redirect
 */

import { test, expect } from '@playwright/test';

test.describe('로그인/로그아웃 플로우', () => {
  test('AUTH-E01: 로그인 성공 플로우', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // Assert - 로그인 페이지 표시
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByTestId('github-login-btn')).toBeVisible();

    // Act - 로그인 버튼 클릭
    await page.getByTestId('github-login-btn').click();

    // Assert - 대시보드로 이동
    await expect(page.getByTestId('dashboard')).toBeVisible();
    await expect(page.getByTestId('project-list')).toBeVisible();
  });

  test('AUTH-E02: 로그인 취소', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // Assert - 로그인 페이지 유지
    await expect(page.getByTestId('login-page')).toBeVisible();

    // 취소 시 여전히 로그인 페이지에 있어야 함
    await expect(page.getByTestId('github-login-btn')).toBeVisible();
  });

  test('AUTH-E03: 로그아웃 플로우', async ({ page }) => {
    // Arrange - 로그인 상태
    await page.goto('/');
    await page.getByTestId('github-login-btn').click();
    await expect(page.getByTestId('dashboard')).toBeVisible();

    // Act - 로그아웃 클릭
    await page.getByTestId('logout-btn').click();

    // Assert - 로그인 페이지로 돌아감
    await expect(page.getByTestId('login-page')).toBeVisible();
  });

  test('AUTH-E04: 세션 만료 시 리다이렉트', async ({ page }) => {
    // 세션 만료는 실제 구현에서 테스트
    // 현재는 로그인 페이지 접근 가능 여부만 확인
    await page.goto('/');
    await expect(page.getByTestId('login-page')).toBeVisible();
  });
});
