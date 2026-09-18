import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFileSync, statSync } from 'node:fs'

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(overflow).toBe(false)
}

function getE2eCredentials() {
  const username = process.env.E2E_CRM_USERNAME?.trim()
  const password = process.env.E2E_CRM_PASSWORD
  return username && password ? { username, password } : null
}

async function loginWithE2eCredentials(page: import('@playwright/test').Page) {
  const credentials = getE2eCredentials()
  if (!credentials) return false

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Usuário ou e-mail').fill(credentials.username)
  await page.getByRole('textbox', { name: 'Senha' }).fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\/)?(?:\?.*)?$/, { timeout: 15000 })
  return true
}

async function expectDownloadWithContent(
  page: import('@playwright/test').Page,
  action: () => Promise<void>,
  expectedText?: string,
) {
  const downloadPromise = page.waitForEvent('download')
  await action()
  const download = await downloadPromise
  expect(await download.failure()).toBeNull()
  const filePath = await download.path()
  expect(filePath).not.toBeNull()
  if (!filePath) return

  expect(statSync(filePath).size).toBeGreaterThan(0)
  if (expectedText) expect(readFileSync(filePath, 'utf8')).toContain(expectedText)
}

test('login do CRM exibe campos completos e acessiveis', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const response = await page.goto('/login', { waitUntil: 'domcontentloaded' })

  expect(response?.status()).toBe(200)
  await expect(page.getByLabel('Usuário ou e-mail')).toBeVisible()
  await expect(page.getByLabel('Usuário ou e-mail')).toHaveAttribute('placeholder', 'Usuário')
  const passwordInput = page.getByRole('textbox', { name: 'Senha' })
  await expect(passwordInput).toBeVisible()
  await expect(passwordInput).toHaveAttribute('placeholder', 'Senha')
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  expect(pageErrors).toEqual([])
})

test('login do CRM não apresenta violações automatizadas de acessibilidade', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(700)

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations.map(violation => `${violation.id}:${violation.impact ?? 'unknown'}`)).toEqual([])
})

test('CRM autenticado percorre os módulos principais sem erro de API ou overflow', async ({ page }) => {
  test.skip(!getE2eCredentials(), 'Defina E2E_CRM_USERNAME e E2E_CRM_PASSWORD para executar o fluxo autenticado')

  const apiFailures: string[] = []
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/api/')) {
      apiFailures.push(`${response.status()} ${response.url()}`)
    }
  })

  expect(await loginWithE2eCredentials(page)).toBe(true)

  for (const route of ['/dashboard', '/leads', '/leads/disparos', '/agenda', '/financeiro', '/editar-site', '/seguranca', '/colaboradores', '/administracao', '/configuracoes']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}(?:\\/)?$`), { timeout: 15000 })
    await page.waitForTimeout(900)
    await expectNoHorizontalOverflow(page)
  }

  await page.goto('/leads', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await expectDownloadWithContent(
    page,
    () => page.getByRole('button', { name: 'Exportar CSV', exact: true }).click(),
    'Nome',
  )

  await page.goto('/financeiro', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await expectDownloadWithContent(page, () => page.getByRole('button', { name: 'CSV', exact: true }).click())
  await expectDownloadWithContent(page, () => page.getByRole('button', { name: 'PDF', exact: true }).click())

  await page.goto('/leads/disparos', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await expectDownloadWithContent(page, () => page.getByRole('button', { name: 'Exportar audiência', exact: true }).click())

  await page.goto('/seguranca', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await expectDownloadWithContent(page, () => page.getByRole('button', { name: 'Exportar PDF', exact: true }).click())

  expect(apiFailures).toEqual([])
})
