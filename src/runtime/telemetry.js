/** @import { RuntimeConfig } from '#config/env-schema.js' */
import { NodeSDK } from '@opentelemetry/sdk-node'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { FastifyOtelInstrumentation } from '@fastify/otel'
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node'
import { HostMetrics } from '@opentelemetry/host-metrics'
import { metrics } from '@opentelemetry/api'

/**
 * Called once by main, after config validation and before importing the app.
 * @param {RuntimeConfig} config
 */
export async function bootstrapTelemetry (config) {
  const Sentry = config.SENTRY_DSN ? await import('@sentry/node') : undefined
  /** @type {NodeSDK | undefined} */
  let sdk
  /** @type {PrometheusExporter | undefined} */
  let exporter
  /** @type {Promise<void> | undefined} */
  let closing
  function shutdown () {
    closing ??= Promise.allSettled([
      sdk ? sdk.shutdown() : exporter?.shutdown(),
      Sentry?.close(5000),
    ]).then(results => {
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length) throw new AggregateError(failures.map(result => result.reason), 'Telemetry shutdown failed')
    })
    return closing
  }
  try {
    Sentry?.init({
      dsn: config.SENTRY_DSN,
      environment: config.SENTRY_ENVIRONMENT ?? config.ENV,
      release: config.SENTRY_RELEASE,
      skipOpenTelemetrySetup: true,
    })
    exporter = config.METRICS === 1
      ? new PrometheusExporter({ port: config.METRICS_PORT, preventServerStart: true })
      : undefined
    sdk = new NodeSDK({
      // skipOpenTelemetrySetup leaves context ownership here; Sentry needs its scope-aware ALS manager.
      ...(Sentry ? { contextManager: new Sentry.SentryContextManager() } : {}),
      metricReaders: exporter ? [exporter] : [],
      instrumentations: [
        new HttpInstrumentation(),
        new RuntimeNodeInstrumentation({ monitoringPrecision: 5000 }),
        new FastifyOtelInstrumentation({
          registerOnInitialization: true,
          ignorePaths: options => options.url === '/health' || options.url === '/*',
        }),
      ],
    })
    sdk.start()
    await exporter?.startServer()
    if (config.METRICS === 1) new HostMetrics({ meterProvider: metrics.getMeterProvider() }).start()
    return { shutdown }
  } catch (err) {
    await shutdown()
    throw err
  }
}
