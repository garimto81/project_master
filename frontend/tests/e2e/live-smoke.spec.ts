import { test, expect } from '@playwright/test'

const LIVE_URL = 'https://frontend-xi-seven.vercel.app'

test.describe('Live Deployment Smoke Tests', () => {
  test('LIVE-01: Home page loads', async ({ page }) => {
    await page.goto(LIVE_URL)
    await expect(page).toHaveTitle(/DevFlow/)
    await expect(page.getByText('DevFlow')).toBeVisible()
  })

  test('LIVE-02: Health API works', async ({ page }) => {
    const response = await page.request.get(`${LIVE_URL}/api/health`)
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data.version).toBeTruthy()
  })

  test('LIVE-03: Project page loads', async ({ page }) => {
    await page.goto(`${LIVE_URL}/project`)
    await expect(page.getByText('DevFlow')).toBeVisible()
  })

  test('LIVE-04: Visualization page loads', async ({ page }) => {
    await page.goto(`${LIVE_URL}/visualization`)
    await expect(page.getByTestId('visualization-page')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('header')).toBeVisible()
  })

  test('LIVE-05: Models API works', async ({ page }) => {
    const response = await page.request.get(`${LIVE_URL}/api/models`)
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.models).toBeDefined()
    expect(Array.isArray(data.models)).toBeTruthy()
  })
})
