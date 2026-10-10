import 'fastify'
import type Stripe from 'stripe'

declare module 'fastify' {
  interface FastifyInstance {
    billing: {
      provider: 'stripe';
      stripe: Stripe | null;
    };
  }
}
