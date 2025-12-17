/**
 * AI CLI E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.5
 *
 * P0 테스트:
 * - CLI-E01: test_model_selection_dropdown
 * - CLI-E02: test_claude_issue_resolution
 * - CLI-E03: test_gpt_issue_resolution
 * - CLI-E04: test_gemini_issue_resolution
 * - CLI-E05: test_model_fallback
 */

import { test, expect } from '@playwright/test';

test.describe('AI CLI 연동', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 모드로 프로젝트 페이지 이동 (mock 데이터 사용)
    await page.goto('/project?repo=test/mock-repo&test=true');

    // 이슈 목록 로드 대기 후 첫 번째 이슈 클릭
    await page.waitForSelector('[data-testid="issue-1"]', { timeout: 10000 });
    await page.getByTestId('issue-1').click();
    await expect(page.getByTestId('issue-detail')).toBeVisible();
  });

  test('CLI-E01: 모델 선택 드롭다운', async ({ page }) => {
    // Assert - 모델 선택 드롭다운이 있어야 함
    const modelSelector = page.getByTestId('model-selector');
    await expect(modelSelector).toBeVisible();

    // Assert - 4개 모델 옵션이 있어야 함
    const options = modelSelector.locator('option');
    await expect(options).toHaveCount(4);

    // Assert - 기본 선택은 Claude
    await expect(modelSelector).toHaveValue('claude');

    // Act - Gemini로 변경
    await modelSelector.selectOption('gemini');
    await expect(modelSelector).toHaveValue('gemini');

    // Act - Codex로 변경
    await modelSelector.selectOption('codex');
    await expect(modelSelector).toHaveValue('codex');
  });

  test('CLI-E02: Claude로 이슈 해결', async ({ page }) => {
    // Arrange - Claude 모델 선택 (기본값)
    await expect(page.getByTestId('model-selector')).toHaveValue('claude');

    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행 표시 확인 (mock 모드에서 빠르게 진행)
    await expect(page.getByTestId('progress-display')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('model-used')).toContainText('claude');
  });

  test('CLI-E03: GPT Codex로 이슈 해결', async ({ page }) => {
    // Arrange - Codex 모델 선택
    await page.getByTestId('model-selector').selectOption('codex');

    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행 표시 및 사용 모델 확인
    await expect(page.getByTestId('progress-display')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('model-used')).toContainText('codex');
  });

  test('CLI-E04: Gemini로 이슈 해결', async ({ page }) => {
    // Arrange - Gemini 모델 선택
    await page.getByTestId('model-selector').selectOption('gemini');

    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행 표시 및 사용 모델 확인
    await expect(page.getByTestId('progress-display')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('model-used')).toContainText('gemini');
  });

  test('CLI-E05: Qwen으로 이슈 해결', async ({ page }) => {
    // Arrange - Qwen 모델 선택
    await page.getByTestId('model-selector').selectOption('qwen');

    // Act - AI 해결 시작
    await page.getByTestId('ai-resolve-btn').click();

    // Assert - 진행 표시 및 사용 모델 확인
    await expect(page.getByTestId('progress-display')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('model-used')).toContainText('qwen');
  });
});
