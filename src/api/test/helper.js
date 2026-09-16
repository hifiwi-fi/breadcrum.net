/**
 * @import { TestContext } from 'node:test'
 * @import { FastifyServerOptions } from 'fastify'
 * @import { RuntimeConfig } from '../../runtime/env-schema.js'
 * @import { AppOptions } from '../../runtime/options.js'
 */
import { createApp } from '../../app.js'

/** @param {Partial<RuntimeConfig>} env @returns {AppOptions} */
export function config (env) {
  return {
    role: 'api',
    envData: {
      EMAIL_SENDING: false,
      EMAIL_VALIDATION: false,
      RATE_LIMITING: false,
      TURNSTILE_VALIDATE: false,
      ...env,
    },
  }
}

/**
 * API tests must never consume jobs from the shared test database.
 * @param {TestContext} t
 * @param {Partial<RuntimeConfig>} [env]
 * @param {FastifyServerOptions} [serverOptions]
 */
export async function build (t, env = {}, serverOptions) {
  const app = await createApp({ ...config(env), serverOptions })
  t.after(() => app.close())
  return app
}
