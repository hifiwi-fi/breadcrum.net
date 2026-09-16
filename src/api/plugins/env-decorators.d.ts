import 'fastify'
import type { RuntimeConfig } from '../../runtime/env-schema.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: RuntimeConfig
  }
}
