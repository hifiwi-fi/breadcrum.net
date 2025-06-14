import type { FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    verifyAdmin(request: FastifyRequest): Promise<void>;
    notDisabled(request: FastifyRequest): Promise<void>;
  }
}
