import 'fastify'
import type { SchemaType } from './env.js'
import type { PackageJson } from 'type-fest'

declare module 'fastify' {
  interface FastifyInstance {
    config: SchemaType,
    pkg: PackageJson
  }
}
