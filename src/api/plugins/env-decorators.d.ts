import 'fastify'
import type { RuntimeConfig } from '#config/env-schema.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: RuntimeConfig
  }
}
