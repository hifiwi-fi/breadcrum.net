import { createApp } from '../src/app.js'
import { loadRuntimeConfig } from '#config/config.js'
import { createShutdown } from '#runtime/shutdown.js'

async function main () {
  const [mode, ...extra] = process.argv.slice(2)
  if (extra.length || (mode !== 'routes' && mode !== 'plugins')) {
    throw new Error('Usage: APP_ROLE=api node scripts/inspect-app.js routes|plugins')
  }
  const config = loadRuntimeConfig()
  if (config.APP_ROLE !== 'api') {
    throw new Error('Inspection requires APP_ROLE=api to avoid activating queue consumers')
  }
  const app = await createApp({ role: config.APP_ROLE, config, serverOptions: { logger: false } })
  const close = createShutdown({
    closeApp: async () => { await app.close() },
    shutdownTelemetry: async () => {},
    timeoutMs: config.SHUTDOWN_TIMEOUT_MS,
    onTimeout: error => {
      console.error(error.message)
      process.exit(1)
    },
  })
  try {
    process.stdout.write(mode === 'routes' ? app.printRoutes() : app.printPlugins())
  } finally {
    await close()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
