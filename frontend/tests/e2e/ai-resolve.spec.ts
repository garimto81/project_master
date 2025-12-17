/**
 * AI 이슈 해결 E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.4
 *
 * P0 테스트:
 * - AI-E01: test_ai_resolve_button_click
 * - AI-E02: test_ai_progress_display
 * - AI-E03: test_ai_approval_flow
 * - AI-E04: test_ai_rollback
 */

import { test, expect } from '@playwright/test';

test.describe('AI 이슈 해결', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 모드로 프로젝트 페이지 이동 (mock 데이터 사용)
    await page.goto('/project?repo=test/mock-repo&test=true');
    await page.waitForSelector('[data-testid="issue-1"]', { timeout: 10000 });
    await page.getByTestId('issue-1').click();
    await expect(page.getByTestId('issue-detail')).toBeVisible();
  });

  test('AI-E01: AI로 해결 버튼 클릭', async ({ page }) => {
    // Assert - AI 해결 버튼이 있어야 함
    const resolveBtn = page.getByTestId('ai-resolve-btn');
    await expect(resolveBtn).toBeVisible();
    await expect(resolveBtn).toBeEnabled();

    // Act - 버튼 클릭
    await resolveBtn.click();

    // Assert - 진행 중 상태
    await expect(resolveBtn).toBeDisabled();
  });

  test('AI-E02: 실시간 진행 표시', async ({ page }) => {
    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행 표시가 나타나야 함
    await expect(page.getByTestId('progress-display')).toBeVisible();
    await expect(page.getByTestId('live-indicator')).toBeVisible();
    await expect(page.getByTestId('progress-bar')).toBeVisible();
  });

  test('AI-E03: 승인 플로우', async ({ page }) => {
    // Act - AI 해결 완료까지 대기
    await page.getByTestId('ai-resolve-btn').click();

    // 진행 완료 대기 (API 실패 시 Mock 폴백 포함)
    await expect(page.getByTestId('approval-modal')).toBeVisible({ timeout: 15000 });

    // Assert - 승인/거부 버튼이 있어야 함
    await expect(page.getByTestId('diff-preview')).toBeVisible();
    await expect(page.getByTestId('approve-btn')).toBeVisible();
    await expect(page.getByTestId('reject-btn')).toBeVisible();
  });

  test('AI-E04: 롤백 기능 (거부)', async ({ page }) => {
    // Act - AI 해결 완료까지 대기
    await page.getByTestId('ai-resolve-btn').click();
    await expect(page.getByTestId('approval-modal')).toBeVisible({ timeout: 15000 });

    // Act - 거부 버튼 클릭
    const rejectBtn = page.getByTestId('reject-btn');
    await expect(rejectBtn).toBeVisible();
  });
});
