import { loadEnvironment, loadRuntimeConfig } from '#config/config.js'
import { telemetryState } from '#runtime/telemetry-state.js'

// Reject legacy role flags before the CLI consumes and discards unknown options.
if (process.argv.some(arg => arg === '--role' || arg.startsWith('--role='))) {
  throw new Error('CLI role flags are not supported; set APP_ROLE=api|worker|all instead')
}

// The CLI watch parent does not serve requests; its fork inherits this Node preload.
const watchParent = !process.env['childEvent'] && process.argv.some(arg => arg === '--watch' || arg === '-w')
if (!watchParent) {
  const environment = loadEnvironment()
  const config = loadRuntimeConfig({ dotEnvPath: false, processEnv: environment })
  for (const [key, value] of Object.entries(environment)) {
    if (value !== undefined) process.env[key] = value
  }
  process.env['OTEL_SERVICE_NAME'] = config.OTEL_SERVICE_NAME
  process.env['OTEL_SERVICE_VERSION'] = config.OTEL_SERVICE_VERSION
  process.env['OTEL_RESOURCE_ATTRIBUTES'] = `${config.OTEL_RESOURCE_ATTRIBUTES},breadcrum.role=${config.APP_ROLE}`
  const { bootstrapTelemetry } = await import('./runtime/telemetry.js')
  const telemetry = await bootstrapTelemetry(config)
  telemetryState.shutdown = telemetry.shutdown
}
