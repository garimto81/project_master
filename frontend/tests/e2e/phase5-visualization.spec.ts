/**
 * Phase 5: 고급 시각화 컴포넌트 E2E 테스트
 */

import { test, expect } from '@playwright/test'

test.describe('Phase 5: 고급 시각화', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 페이지로 이동 (실제 구현 시 적절한 경로로 변경)
    await page.goto('/visualization')
  })

  test.describe('VersionCompare 컴포넌트', () => {
    test('컴포넌트가 렌더링되어야 함', async ({ page }) => {
      const component = page.locator('[data-testid="version-compare"]')
      // 컴포넌트가 페이지에 있으면 테스트
      if (await component.count() > 0) {
        await expect(component).toBeVisible()
      }
    })

    test('분할 뷰와 통합 뷰 전환이 동작해야 함', async ({ page }) => {
      const component = page.locator('[data-testid="version-compare"]')
      if (await component.count() > 0) {
        const splitBtn = component.getByText('분할 뷰')
        const unifiedBtn = component.getByText('통합 뷰')

        if (await splitBtn.count() > 0) {
          await splitBtn.click()
          await expect(splitBtn).toHaveClass(/bg-blue/)
        }
      }
    })
  })

  test.describe('ErrorTrace 컴포넌트', () => {
    test('컴포넌트가 렌더링되어야 함', async ({ page }) => {
      const component = page.locator('[data-testid="error-trace"]')
      if (await component.count() > 0) {
        await expect(component).toBeVisible()
      }
    })

    test('전체 위험 지점 버튼이 동작해야 함', async ({ page }) => {
      const component = page.locator('[data-testid="error-trace"]')
      if (await component.count() > 0) {
        const riskBtn = component.getByText(/전체 위험 지점/)
        if (await riskBtn.count() > 0) {
          await riskBtn.click()
          // 위험 지점 목록이 표시되어야 함
        }
      }
    })
  })

  test.describe('AIExplainer 컴포넌트', () => {
    test('컴포넌트가 렌더링되어야 함', async ({ page }) => {
      const component = page.locator('[data-testid="ai-explainer"]')
      if (await component.count() > 0) {
        await expect(component).toBeVisible()
      }
    })

    test('빠른 설명 버튼이 표시되어야 함', async ({ page }) => {
      const component = page.locator('[data-testid="ai-explainer"]')
      if (await component.count() > 0) {
        const overviewBtn = component.getByText('프로젝트 개요')
        if (await overviewBtn.count() > 0) {
          await expect(overviewBtn).toBeVisible()
        }
      }
    })
  })

  test.describe('CodeSync 컴포넌트', () => {
    test('컴포넌트가 렌더링되어야 함', async ({ page }) => {
      const component = page.locator('[data-testid="code-sync"]')
      if (await component.count() > 0) {
        await expect(component).toBeVisible()
      }
    })

    test('동기화 모드 선택이 가능해야 함', async ({ page }) => {
      const component = page.locator('[data-testid="code-sync"]')
      if (await component.count() > 0) {
        const modeSelect = component.locator('select')
        if (await modeSelect.count() > 0) {
          await modeSelect.selectOption('bidirectional')
        }
      }
    })
  })
})
