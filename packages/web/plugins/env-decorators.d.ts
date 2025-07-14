import 'fastify'
import type { DotEnvSchemaType } from '../config/env-schema.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: DotEnvSchemaType,
  }
}
