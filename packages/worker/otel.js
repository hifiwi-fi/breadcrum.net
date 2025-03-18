import { NodeSDK } from '@opentelemetry/sdk-node'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import FastifyOtelInstrumentation from '@fastify/otel'

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'breadcrum-app',
    // [ATTR_SERVICE_VERSION]: '0.1.0',
  }),
  metricReader: new PrometheusExporter({ port: 9091 }),
  instrumentations: [new HttpInstrumentation()],
})

const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
  registerOnInitialization: true,
})

sdk.start()

export { sdk, fastifyOtelInstrumentation }
