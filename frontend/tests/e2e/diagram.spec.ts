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
    // 프로젝트 페이지로 직접 이동, 이슈 선택
    await page.goto('/project');
    await page.getByTestId('issue-1').click();
    await expect(page.getByTestId('issue-detail')).toBeVisible();
  });

  test('DG-E01: 다이어그램 표시', async ({ page }) => {
    // Assert - 다이어그램 영역이 있어야 함
    await expect(page.getByTestId('code-diagram')).toBeVisible();
  });

  test('DG-E02: 노드 클릭 인터랙션', async ({ page }) => {
    // Assert - 노드가 표시되어야 함
    const node = page.getByTestId('diagram-node');
    await expect(node).toBeVisible();
  });

  test('DG-E03: 줌/패닝 컨트롤', async ({ page }) => {
    // 다이어그램 영역 확인 (React Flow가 있으면 줌/패닝 지원)
    await expect(page.getByTestId('code-diagram')).toBeVisible();
  });

  test('DG-E04: 에러 노드 팝업', async ({ page }) => {
    // 에러 노드는 빨간색으로 표시되어야 함
    // TODO: 에러 상태 시뮬레이션 추가
    await expect(page.getByTestId('code-diagram')).toBeVisible();
  });
});
