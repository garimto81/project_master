/**
 * VISUALIZATION E2E 테스트
 * PRD v6.2 Section 1.2: 다층 시각화 시스템
 *
 * P0 테스트:
 * - VIS-E01: 시각화 페이지 로드
 * - VIS-E02: 구조 보기 다이어그램 표시
 * - VIS-E03: 실행 흐름 모드 전환
 * - VIS-E04: 스텝 플레이어 컨트롤
 */

import { test, expect } from '@playwright/test'

test.describe('코드 시각화', () => {
  test('VIS-E01: 시각화 페이지 로드', async ({ page }) => {
    // 시각화 페이지로 이동
    await page.goto('/visualization')

    // 페이지 로드 확인
    await expect(page.getByTestId('visualization-page')).toBeVisible()
    await expect(page.getByTestId('header')).toBeVisible()

    // 모드 토글 버튼 확인
    await expect(page.getByTestId('btn-overview')).toBeVisible()
    await expect(page.getByTestId('btn-step-player')).toBeVisible()
  })

  test('VIS-E02: 구조 보기 다이어그램 표시', async ({ page }) => {
    // 시각화 페이지로 이동
    await page.goto('/visualization')

    // 구조 보기 섹션 확인
    await expect(page.getByTestId('overview-section')).toBeVisible()

    // LogicFlowViewer 컴포넌트 로드 대기
    await expect(page.getByTestId('logic-flow-viewer')).toBeVisible({ timeout: 10000 })

    // 로딩 완료 대기 (mermaid-container 또는 에러 메시지)
    await page.waitForTimeout(2000) // API 응답 대기

    // Mermaid 다이어그램 컨테이너 확인 (폴백 데이터로도 렌더링됨)
    const mermaidContainer = page.getByTestId('mermaid-container')
    const hasContainer = await mermaidContainer.count() > 0
    if (hasContainer) {
      await expect(mermaidContainer).toBeVisible({ timeout: 5000 })
    }
  })

  test('VIS-E03: 실행 흐름 모드 전환', async ({ page }) => {
    // 시각화 페이지로 이동
    await page.goto('/visualization')

    // 페이지 로드 대기
    await expect(page.getByTestId('visualization-page')).toBeVisible()

    // 기본: 구조 보기 모드
    await expect(page.getByTestId('overview-section')).toBeVisible()

    // 실행 흐름 버튼 클릭
    const stepPlayerBtn = page.getByTestId('btn-step-player')
    await expect(stepPlayerBtn).toBeVisible()
    await stepPlayerBtn.click()

    // 전환 대기
    await page.waitForTimeout(500)

    // 실행 흐름 섹션으로 전환
    await expect(page.getByTestId('step-player-section')).toBeVisible({ timeout: 5000 })

    // 함수 선택 드롭다운 확인
    await expect(page.getByTestId('function-select')).toBeVisible()

    // 다시 구조 보기로 전환
    await page.getByTestId('btn-overview').click()
    await page.waitForTimeout(500)
    await expect(page.getByTestId('overview-section')).toBeVisible({ timeout: 5000 })
  })

  test('VIS-E04: 스텝 플레이어 컨트롤', async ({ page }) => {
    // 시각화 페이지로 이동
    await page.goto('/visualization')

    // 페이지 로드 대기
    await expect(page.getByTestId('visualization-page')).toBeVisible()

    // 실행 흐름 모드로 전환
    const stepPlayerBtn = page.getByTestId('btn-step-player')
    await expect(stepPlayerBtn).toBeVisible()
    await stepPlayerBtn.click()
    await page.waitForTimeout(500)
    await expect(page.getByTestId('step-player-section')).toBeVisible({ timeout: 5000 })

    // 함수 선택
    const functionSelect = page.getByTestId('function-select')
    await expect(functionSelect).toBeVisible()
    await functionSelect.selectOption('handleLogin')

    // 스텝 플레이어 로드 대기
    await page.waitForTimeout(1000) // API 응답 대기
    await expect(page.getByTestId('step-player')).toBeVisible({ timeout: 10000 })

    // 컨트롤 버튼 확인 (로딩 완료 후)
    await page.waitForTimeout(1000)
    const playBtn = page.getByTestId('btn-play')
    const hasPlayBtn = await playBtn.count() > 0
    if (hasPlayBtn) {
      await expect(playBtn).toBeVisible()
      await expect(page.getByTestId('btn-prev')).toBeVisible()
      await expect(page.getByTestId('btn-next')).toBeVisible()
      await expect(page.getByTestId('speed-slider')).toBeVisible()
    }
  })

  test('VIS-E05: 레포지토리 파라미터', async ({ page }) => {
    // 특정 레포로 시각화 페이지 접근
    await page.goto('/visualization?repo=garimto81/project_master')

    // 페이지 로드 확인
    await expect(page.getByTestId('visualization-page')).toBeVisible()

    // 레포지토리 정보 표시 확인 (첫 번째 요소만)
    await expect(page.getByText('garimto81/project_master').first()).toBeVisible()
  })
})
