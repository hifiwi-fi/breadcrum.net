import fp from 'fastify-plugin'
import { registerOtelShutdown } from '@breadcrum/resources/fastify-common/otel-shutdown.js'

export default fp(async function otelShutdown (fastify) {
  registerOtelShutdown(fastify)
}, {
  name: 'otel-shutdown',
})
