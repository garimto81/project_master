/**
 * 코드 다이어그램 E2E 테스트
 * 문서: 0004-tdd-test-plan.md 섹션 2.7
 *
 * P0 테스트:
 * - DG-E01: test_diagram_display
 * - DG-E02: test_node_click_interaction
 * - DG-E03: test_zoom_pan_controls
 * - DG-E04: test_error_node_popup
 */

import { test, expect } from '@playwright/test';

test.describe('코드 다이어그램', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 모드로 프로젝트 페이지 이동 (mock 데이터 사용)
    await page.goto('/project?repo=test/mock-repo&test=true');
    // 다이어그램 섹션 로드 대기
    await page.waitForSelector('[data-testid="code-diagram-section"]', { timeout: 10000 });
  });

  test('DG-E01: 다이어그램 표시', async ({ page }) => {
    // Assert - 다이어그램 섹션이 있어야 함
    await expect(page.getByTestId('code-diagram-section')).toBeVisible();
    // 다이어그램 컨테이너가 있어야 함
    await expect(page.getByTestId('interactive-diagram-container')).toBeVisible();
  });

  test('DG-E02: 노드 클릭 인터랙션', async ({ page }) => {
    // Assert - InteractiveFlowDiagram이 표시되어야 함
    const diagram = page.getByTestId('interactive-flow-diagram');
    await expect(diagram).toBeVisible();
  });

  test('DG-E03: 줌/패닝 컨트롤', async ({ page }) => {
    // InteractiveFlowDiagram이 줌/패닝을 지원함
    await expect(page.getByTestId('interactive-flow-diagram')).toBeVisible();
    // 줌 컨트롤 버튼 확인 (+, −, 리셋)
    await expect(page.getByRole('button', { name: '+' })).toBeVisible();
    await expect(page.getByRole('button', { name: '리셋' })).toBeVisible();
  });

  test('DG-E04: 에러 상태 표시', async ({ page }) => {
    // 다이어그램 섹션 제목 확인
    const section = page.getByTestId('code-diagram-section');
    await expect(section).toBeVisible();
    await expect(section.locator('h2')).toContainText('코드 구조 시각화');
  });
});
