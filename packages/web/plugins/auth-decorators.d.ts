import type { FastifyRequest as ImportedFastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    verifyAdmin(request: ImportedFastifyRequest): Promise<void>;
    notDisabled(request: ImportedFastifyRequest): Promise<void>;
  }

  interface FastifyRequest {
    feedTokenUser?: {
      userId: string;
      token: string;
    } | null;
  }
}
