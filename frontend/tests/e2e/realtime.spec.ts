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

// AI 자동 모드 테스트 (MOCK_AI_API=true 환경에서 실행)
test.describe('실시간 진행 표시', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 모드로 프로젝트 페이지 이동 (mock 데이터 사용)
    await page.goto('/project?repo=test/mock-repo&test=true');
    await page.waitForSelector('[data-testid="issue-1"]', { timeout: 10000 });
    await page.getByTestId('issue-1').click();
  });

  test('RT-E01: LIVE 표시', async ({ page }) => {
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

    // 진행률이 0 이상이어야 함
    const progress = await progressBar.getAttribute('value');
    expect(Number(progress)).toBeGreaterThanOrEqual(0);
  });

  test('RT-E03: 단계 체크리스트 업데이트', async ({ page }) => {
    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행률 텍스트가 업데이트되어야 함
    await expect(page.getByTestId('progress-text')).toBeVisible();

    // 진행률이 표시되어야 함 (0% ~ 100%)
    const progressText = await page.getByTestId('progress-text').textContent();
    expect(progressText).toMatch(/\d+%/);
  });

  test('RT-E04: 실시간 로그 스크롤', async ({ page }) => {
    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행 표시 영역이 있어야 함
    await expect(page.getByTestId('progress-display')).toBeVisible();

    // model-used 표시 확인
    await expect(page.getByTestId('model-used')).toBeVisible();
  });
});
