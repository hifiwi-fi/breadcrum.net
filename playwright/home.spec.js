/// <reference lib="dom" />

import { expect, test } from '@playwright/test'

test('homepage serves referral links with a clean canonical URL', async ({ page, baseURL }) => {
  const referral = '/?ref=blog.thenotification.app'
  const response = await page.goto(referral)

  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(referral)
  await expect(page.getByRole('heading', { level: 1, name: 'Breadcrum' })).toBeVisible()
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}/`)
})

test('the built site installs its service worker at the root scope', async ({ page, baseURL }) => {
  await page.goto('/')

  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/')
    return {
      script: registration?.active?.scriptURL,
      scope: registration?.scope,
    }
  })).toEqual({ script: `${baseURL}/service-worker.js`, scope: `${baseURL}/` })
})
