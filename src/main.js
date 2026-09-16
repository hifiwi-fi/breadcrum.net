/** @import { FastifyInstance } from 'fastify' */
import { parseRole } from './runtime/role.js'
import { loadConfig, loadEnvironment } from './runtime/config.js'
import { createShutdown } from './runtime/shutdown.js'

async function main () {
  const role = parseRole(process.argv.slice(2))
  const environment = loadEnvironment()
  const config = loadConfig(role, { dotEnvPath: false, processEnv: environment })
  // Preserve library-specific env settings as well as the validated application configuration.
  for (const [key, value] of Object.entries(environment)) {
    if (value !== undefined) process.env[key] = value
  }
  // SDK resource detection reads process.env during import/start, not Fastify config.
  process.env['OTEL_SERVICE_NAME'] = config.OTEL_SERVICE_NAME
  process.env['OTEL_SERVICE_VERSION'] = config.OTEL_SERVICE_VERSION
  process.env['OTEL_RESOURCE_ATTRIBUTES'] = `${config.OTEL_RESOURCE_ATTRIBUTES},breadcrum.role=${role}`
  const { bootstrapTelemetry } = await import('./runtime/telemetry.js')
  const telemetry = await bootstrapTelemetry(config)

  /** @type {FastifyInstance | undefined} */
  let app
  let stopping = false

  const startup = (async () => {
    const { createApp } = await import('./app.js')
    app = await createApp({ role, config })
    if (!stopping) await app.listen({ host: config.LISTEN_HOST, port: config.PORT })
  })()

  const shutdown = createShutdown({
    timeoutMs: config.SHUTDOWN_TIMEOUT_MS,
    closeApp: async () => {
      stopping = true
      await startup.catch(() => {})
      await app?.close()
    },
    shutdownTelemetry: async () => {
      try {
        await telemetry.shutdown()
      } finally {
        process.off('SIGINT', onSignal)
        process.off('SIGTERM', onSignal)
      }
    },
    onTimeout: error => {
      console.error(error.message)
      process.exit(1)
    },
  })

  function onSignal () {
    shutdown().catch(err => {
      console.error(err)
      process.exit(1)
    })
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)

  try {
    await startup
  } catch (err) {
    await shutdown()
    throw err
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
