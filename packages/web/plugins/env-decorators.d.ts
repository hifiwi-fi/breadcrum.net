import 'fastify'
import type { SchemaType } from './env.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: SchemaType
  }
}
