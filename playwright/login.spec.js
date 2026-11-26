import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

test('signs in with a password and ends the browser session on logout', async ({ page, request }) => {
  const username = `e2e-${randomUUID().slice(0, 8)}`
  const password = randomUUID()
  // The separate request context creates a real account without signing the browser in.
  const registration = await request.post('/api/register', {
    data: { username, email: `${username}@example.test`, password, newsletter_subscription: false },
  })
  expect(registration.status(), await registration.text()).toBe(201)
  expect((await page.request.get('/api/user')).status()).toBe(401)

  await page.goto('/login/')
  await page.getByLabel(/Email or Username/).fill(username)
  const passwordInput = page.getByLabel(/^Password:/)
  await passwordInput.fill('wrong-password')
  const rejected = page.waitForResponse(response => new URL(response.url()).pathname === '/api/login')
  await passwordInput.press('Enter')
  expect((await rejected).status()).toBe(401)
  await expect(page.getByText(/^401\b/)).toBeVisible()
  await expect(passwordInput).toBeEnabled()

  await passwordInput.fill(password)
  await passwordInput.press('Enter')
  await expect(page).toHaveURL(/\/bookmarks\/$/)
  await expect(page.getByRole('link', { name: username, exact: true })).toBeVisible()
  const user = await page.request.get('/api/user')
  expect(user.status()).toBe(200)
  expect(await user.json()).toMatchObject({ username })

  await page.getByRole('link', { name: 'logout', exact: true }).click()
  await expect(page).toHaveURL('/')
  expect((await page.request.get('/api/user')).status()).toBe(401)
})
