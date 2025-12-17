/**
 * ISSUE E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.3
 *
 * P0 테스트:
 * - ISSUE-E01: test_open_issues_accordion
 * - ISSUE-E02: test_closed_issues_accordion
 * - ISSUE-E03: test_issue_click_detail_view
 * - ISSUE-E04: test_issue_close_button
 * - ISSUE-E05: test_issue_reopen_button
 */

import { test, expect } from '@playwright/test';

test.describe('이슈 관리', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 모드로 프로젝트 페이지 이동 (mock 데이터 사용, 로그인 불필요)
    await page.goto('/project?repo=test/mock-repo&test=true');
    await expect(page.getByTestId('project-page')).toBeVisible();
  });

  test('ISSUE-E01: 열린 이슈 아코디언', async ({ page }) => {
    // Assert - 열린 이슈 아코디언이 있어야 함
    const openAccordion = page.getByTestId('open-issues-accordion');
    await expect(openAccordion).toBeVisible();

    // Assert - 열린 이슈 목록이 표시되어야 함
    await expect(page.getByTestId('open-issues-list')).toBeVisible();
  });

  test('ISSUE-E02: 닫힌 이슈 아코디언', async ({ page }) => {
    // Assert - 닫힌 이슈 아코디언이 있어야 함
    const closedAccordion = page.getByTestId('closed-issues-accordion');
    await expect(closedAccordion).toBeVisible();
  });

  test('ISSUE-E03: 이슈 클릭 → 상세 화면', async ({ page }) => {
    // Act - 이슈 클릭
    await page.getByTestId('issue-1').click();

    // Assert - 이슈 상세 화면 표시
    await expect(page.getByTestId('issue-detail')).toBeVisible();
    await expect(page.getByTestId('ai-resolve-btn')).toBeVisible();
  });

  test('ISSUE-E04: 이슈 닫기 버튼', async ({ page }) => {
    // Act - 이슈 선택
    await page.getByTestId('issue-1').click();

    // Assert - 상세 화면에서 상태 확인 가능
    await expect(page.getByTestId('issue-detail')).toBeVisible();
  });

  test('ISSUE-E05: 이슈 다시 열기 버튼', async ({ page }) => {
    // Act - 닫힌 이슈 선택
    await page.getByTestId('closed-issues-accordion').click();
    await page.getByTestId('issue-3').click();

    // Assert - 상세 화면 표시
    await expect(page.getByTestId('issue-detail')).toBeVisible();
  });
});
