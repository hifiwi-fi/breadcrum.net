import 'fastify'
import { PoolClient } from 'pg'

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Retrieves the feature flags.
     *
     * @param options - The options for retrieving flags.
     * @param options.pgClient - The PostgreSQL client instance.
     * @param options.frontend - Whether to retrieve frontend flags.
     * @param options.backend - Whether to retrieve backend flags.
     * @returns The retrieved flag set.
     */
    getFlags(options: {
      pgClient?: PoolClient | FastifyInstance['pg'];
      frontend?: boolean;
      backend?: boolean;
    }): Promise<Record<string, any>>;
  }
}
