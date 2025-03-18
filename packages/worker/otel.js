import { NodeSDK } from '@opentelemetry/sdk-node'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { FastifyOtelInstrumentation } from '@fastify/otel'
import { resourceFromAttributes } from '@opentelemetry/resources'
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

export const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'breadcrum-worker',
    // [ATTR_SERVICE_VERSION]: '0.1.0',
  }),
  metricReader: new PrometheusExporter({ port: 9092 }),
  // traceExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new RuntimeNodeInstrumentation({
      monitoringPrecision: 5000,
    }),
  ],
})

sdk.start()

export const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
  registerOnInitialization: true,
})
// fastifyOtelInstrumentation.setTracerProvider(trace.getTracerProvider())
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
