import 'fastify'
import type { PackageJson } from 'type-fest'

declare module 'fastify' {
  interface FastifyInstance {
    pkg: PackageJson
  }
}
