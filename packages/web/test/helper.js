// This file contains code that we reuse
// between our tests.

/**
 * @import { TestContext } from 'node:test'
 * @import { FastifyInstance } from 'fastify'
 * @import { DotEnvSchemaType } from '../config/env-schema.js'
 * @import { AppOptions } from '../config/server-options.js'
*/

import helper from 'fastify-cli/helper.js'
import path from 'path'

const appPath = path.join(import.meta.dirname, '../app.js')

const testingEnv = /** @type {const} @satisfies {Partial<DotEnvSchemaType>} */ ({
  EMAIL_SENDING: false,
  EMAIL_VALIDATION: false,
  RATE_LIMITING: false
})

// Fill in this config with all the configurations
// needed for testing the application
/**
 *
 * @param {Partial<DotEnvSchemaType>} env
 * @returns {Partial<AppOptions>}
 */
function config (env) {
  return {
    envData: env,
    skipOverride: true, // Register our application with fastify-plugin
  }
}

/**
 * Automatically build and tear down our instance
 * @param {TestContext} t - Test context instance
 * @param {Partial<DotEnvSchemaType>} env
 * @param {object} serverOptions
 * @returns {Promise<FastifyInstance>}
 */
async function build (t, env, serverOptions) {
  // you can set all the options supported by the fastify CLI command
  const argv = ['--options', appPath]

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup

  /**
   * fastify-plugin ensures that all decorators
   * are exposed for testing purposes, this is
   * different from the production setup
   *
   * @type {FastifyInstance}
   */
  const app = await helper.build(argv, config({ ...testingEnv, ...env }), serverOptions)

  // tear down our app after we are done
  t.after(async () => {
    console.log('Closing app...')
    await app.close()
    console.log('App closed...')
    // Add a small delay to ensure resources are released
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  await app.ready()
  return app
}

export {
  config,
  build,
}
