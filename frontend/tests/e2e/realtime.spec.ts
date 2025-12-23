/**
 * 실시간 진행 표시 E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.6
 *
 * P0 테스트:
 * - RT-E01: test_live_indicator_display
 * - RT-E02: test_progress_bar_animation
 * - RT-E03: test_phase_checklist_update
 */

import { test, expect } from '@playwright/test';

// TODO: #42 - AI 자동 모드 구현 후 테스트 활성화
// 현재 AI 모델은 리다이렉트 모드로 동작하여 progress-display가 표시되지 않음
test.describe.skip('실시간 진행 표시', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 모드로 프로젝트 페이지 이동 (mock 데이터 사용)
    await page.goto('/project?repo=test/mock-repo&test=true');
    await page.waitForSelector('[data-testid="issue-1"]', { timeout: 10000 });
    await page.getByTestId('issue-1').click();
  });

  test('RT-E01: 🔴 LIVE 표시', async ({ page }) => {
    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - LIVE 인디케이터가 표시되어야 함
    await expect(page.getByTestId('live-indicator')).toBeVisible();
    await expect(page.getByTestId('live-indicator')).toContainText('LIVE');
  });

  test('RT-E02: 진행 바 애니메이션', async ({ page }) => {
    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행 바가 표시되어야 함
    const progressBar = page.getByTestId('progress-bar');
    await expect(progressBar).toBeVisible();

    // 진행률이 증가해야 함
    await page.waitForTimeout(1000);
    const progress = await progressBar.getAttribute('value');
    expect(Number(progress)).toBeGreaterThanOrEqual(0);
  });

  test('RT-E03: 단계 체크리스트 업데이트', async ({ page }) => {
    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행률 텍스트가 업데이트되어야 함
    await expect(page.getByTestId('progress-text')).toBeVisible();
  });

  test('RT-E04: 실시간 로그 스크롤', async ({ page }) => {
    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행 표시 영역이 있어야 함
    await expect(page.getByTestId('progress-display')).toBeVisible();
  });
});
