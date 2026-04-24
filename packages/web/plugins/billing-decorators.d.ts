import 'fastify'
import type Stripe from 'stripe'

declare module 'fastify' {
  interface FastifyInstance {
    billing: {
      stripe: Stripe;
    };
  }
}
