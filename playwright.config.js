import { defineConfig } from '@playwright/test'

const host = '127.0.0.1'
const port = 4173
const baseURL = `http://${host}:${port}`

export default defineConfig({
  testDir: './playwright',
  forbidOnly: Boolean(process.env['CI']),
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node playwright/serve.js ${host} ${port}`,
    url: `${baseURL}/health`,
    timeout: 90_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 25_000 },
  },
})
