import process from 'node:process'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { FastifyOtelInstrumentation } from '@fastify/otel'
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node'
import { HostMetrics } from '@opentelemetry/host-metrics'
import { metrics } from '@opentelemetry/api'

/*
// Tracing boilerplate.
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces', // default OTLP collector endpoint
})
*/

const ignoredRoutes = {
  '/*': true,
  '/health': true,
}

// See https://opentelemetry.io/docs/languages/sdk-configuration/general/ for ENV var
export const sdk = new NodeSDK({
  // Resource attributes are automatically set by OTEL_SERVICE_NAME, OTEL_SERVICE_VERSION, and OTEL_RESOURCE_ATTRIBUTES env vars
  metricReader: new PrometheusExporter({ port: 9091 }),
  // traceExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new RuntimeNodeInstrumentation({ monitoringPrecision: 5000, }),
    new FastifyOtelInstrumentation({
      registerOnInitialization: true,
      ignorePaths: (routeOptions) => {
        // Ignore static file wildcard routes and health endpoints
        return routeOptions.url in ignoredRoutes
      },
    })
  ],
})

sdk.start()

// Must come after sdk.start() for getMeterProvider to return something
new HostMetrics({ meterProvider: metrics.getMeterProvider() }).start()

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log(new Error('Error shutting down SDK', { cause: err }))
    )
})
