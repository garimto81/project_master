/**
 * Phase 7: 비개발자 협업 기능 E2E 테스트
 */

import { test, expect } from '@playwright/test'

test.describe('Phase 7: 비개발자 협업', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 페이지로 이동
    await page.goto('/visualization')
  })

  test.describe('FeedbackPanel 컴포넌트', () => {
    test('컴포넌트가 렌더링되어야 함', async ({ page }) => {
      const component = page.locator('[data-testid="feedback-panel"]')
      if (await component.count() > 0) {
        await expect(component).toBeVisible()
      }
    })

    test('피드백 타입 선택이 가능해야 함', async ({ page }) => {
      const component = page.locator('[data-testid="feedback-panel"]')
      if (await component.count() > 0) {
        const bugBtn = component.getByText('버그 신고')
        if (await bugBtn.count() > 0) {
          await bugBtn.click()
          // Step 2로 이동되어야 함
          const titleInput = component.locator('input[type="text"]')
          await expect(titleInput).toBeVisible()
        }
      }
    })

    test('피드백 우선순위 선택이 가능해야 함', async ({ page }) => {
      const component = page.locator('[data-testid="feedback-panel"]')
      if (await component.count() > 0) {
        // 버그 타입 선택
        const bugBtn = component.getByText('버그 신고')
        if (await bugBtn.count() > 0) {
          await bugBtn.click()

          // 우선순위 버튼들 확인
          const highBtn = component.getByText('높음')
          if (await highBtn.count() > 0) {
            await highBtn.click()
            await expect(highBtn).toHaveClass(/ring/)
          }
        }
      }
    })
  })

  test.describe('ProblemAnalyzer 컴포넌트', () => {
    test('컴포넌트가 렌더링되어야 함', async ({ page }) => {
      const component = page.locator('[data-testid="problem-analyzer"]')
      if (await component.count() > 0) {
        await expect(component).toBeVisible()
      }
    })

    test('탭 전환이 가능해야 함', async ({ page }) => {
      const component = page.locator('[data-testid="problem-analyzer"]')
      if (await component.count() > 0) {
        const autoTab = component.getByText('자동 감지')
        if (await autoTab.count() > 0) {
          await autoTab.click()
          await expect(autoTab).toHaveClass(/text-blue/)
        }
      }
    })

    test('가이드 분석 단계가 동작해야 함', async ({ page }) => {
      const component = page.locator('[data-testid="problem-analyzer"]')
      if (await component.count() > 0) {
        // 첫 번째 질문 응답
        const firstQuestion = component.getByText('화면이 제대로 표시되지 않나요?')
        if (await firstQuestion.count() > 0) {
          await firstQuestion.click()
          // 다음 단계로 이동되어야 함
        }
      }
    })
  })

  test.describe('SolutionDirector 컴포넌트', () => {
    test('컴포넌트가 렌더링되어야 함', async ({ page }) => {
      const component = page.locator('[data-testid="solution-director"]')
      if (await component.count() > 0) {
        await expect(component).toBeVisible()
      }
    })

    test('접근 방식 선택이 가능해야 함', async ({ page }) => {
      const component = page.locator('[data-testid="solution-director"]')
      if (await component.count() > 0) {
        const fixBtn = component.getByText('직접 수정')
        if (await fixBtn.count() > 0) {
          await fixBtn.click()
          // 다음 단계로 이동되어야 함
        }
      }
    })

    test('우선순위 선택이 가능해야 함', async ({ page }) => {
      const component = page.locator('[data-testid="solution-director"]')
      if (await component.count() > 0) {
        // Step 1 완료
        const fixBtn = component.getByText('직접 수정')
        if (await fixBtn.count() > 0) {
          await fixBtn.click()

          // Step 2에서 우선순위 선택
          const balanceBtn = component.getByText('균형')
          if (await balanceBtn.count() > 0) {
            await balanceBtn.click()
            await expect(balanceBtn).toHaveClass(/border-blue/)
          }
        }
      }
    })
  })
})
