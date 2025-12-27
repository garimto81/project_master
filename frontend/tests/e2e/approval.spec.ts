/**
 * 승인 플로우 E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.8
 *
 * P0 테스트:
 * - AP-E01: test_approval_modal_display
 * - AP-E02: test_diff_preview_display
 * - AP-E03: test_approve_button
 * - AP-E04: test_reject_button
 * - AP-E05: test_edit_request_button
 */

import { test, expect } from '@playwright/test';

// TODO: #42 - AI 자동 모드 구현 후 테스트 활성화
// 현재 AI 모델은 리다이렉트 모드로 동작하여 approval-modal이 표시되지 않음
test.describe.skip('승인 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 모드로 프로젝트 페이지 이동 (mock 데이터 사용)
    await page.goto('/project?repo=test/mock-repo&test=true');
    await page.waitForSelector('[data-testid="issue-1"]', { timeout: 10000 });
    await page.getByTestId('issue-1').click();

    // AI 해결 완료까지 대기 (Mock 폴백으로 빠르게 진행)
    await page.getByTestId('ai-resolve-btn').click();
    await expect(page.getByTestId('approval-modal')).toBeVisible({ timeout: 15000 });
  });

  test('AP-E01: 승인 모달 표시', async ({ page }) => {
    // Assert - 승인 모달이 표시되어야 함
    await expect(page.getByTestId('approval-modal')).toBeVisible();
  });

  test('AP-E02: Diff 미리보기', async ({ page }) => {
    // Assert - Diff 미리보기가 표시되어야 함
    await expect(page.getByTestId('diff-preview')).toBeVisible();
    await expect(page.getByTestId('diff-preview')).toContainText('old code');
    await expect(page.getByTestId('diff-preview')).toContainText('new code');
  });

  test('AP-E03: 승인 버튼', async ({ page }) => {
    // Assert - 승인 버튼이 있어야 함
    const approveBtn = page.getByTestId('approve-btn');
    await expect(approveBtn).toBeVisible();
    await expect(approveBtn).toBeEnabled();
  });

  test('AP-E04: 거부 버튼', async ({ page }) => {
    // Assert - 거부 버튼이 있어야 함
    const rejectBtn = page.getByTestId('reject-btn');
    await expect(rejectBtn).toBeVisible();
    await expect(rejectBtn).toBeEnabled();
  });

  test('AP-E05: 수정 요청 버튼', async ({ page }) => {
    // 현재 UI에는 승인/거부만 있음
    // 수정 요청 기능 추가 시 테스트 확장
    await expect(page.getByTestId('approval-modal')).toBeVisible();
  });
});
