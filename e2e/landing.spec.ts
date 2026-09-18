import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(overflow).toBe(false)
}

test('landing publica carrega o hero e permanece navegavel', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const response = await page.goto('/', { waitUntil: 'domcontentloaded' })

  expect(response?.status()).toBe(200)
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('img').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /agendar avaliação/i }).first()).toBeVisible()
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('menu mobile não duplica o controle de fechamento', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Menu mobile' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fechar menu' })).toHaveCount(1)
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Fechar menu' }).click()
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveCount(1)
})

test('landing não apresenta violações automatizadas de acessibilidade', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations.map(violation => `${violation.id}:${violation.impact ?? 'unknown'}`)).toEqual([])
})
