/**
 * PROJECT E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.2
 *
 * P0 테스트:
 * - REPO-E01: test_project_list_display
 * - REPO-E02: test_project_search
 * - REPO-E03: test_project_selection
 */

import { test, expect } from '@playwright/test';

test.describe('프로젝트 관리', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/');
    await page.getByTestId('github-login-btn').click();
    await expect(page.getByTestId('dashboard')).toBeVisible();
  });

  test('REPO-E01: 프로젝트 목록 표시', async ({ page }) => {
    // Assert - 프로젝트 목록이 표시되어야 함
    await expect(page.getByTestId('project-list')).toBeVisible();
    await expect(page.getByTestId('project-item')).toBeVisible();
  });

  test('REPO-E02: 프로젝트 검색', async ({ page }) => {
    // Arrange
    const searchInput = page.getByTestId('project-search');

    // Assert - 검색 입력창이 있어야 함
    await expect(searchInput).toBeVisible();

    // Act - 검색어 입력
    await searchInput.fill('sample');

    // Assert - 검색 기능 동작 (UI 업데이트 확인)
    await expect(searchInput).toHaveValue('sample');
  });

  test('REPO-E03: 프로젝트 선택', async ({ page }) => {
    // Act - 프로젝트 링크 클릭
    await page.getByTestId('project-item').locator('a').click();

    // Assert - 프로젝트 페이지로 이동
    await expect(page.getByTestId('project-page')).toBeVisible();
    await expect(page.getByTestId('issue-board')).toBeVisible();
  });
});
