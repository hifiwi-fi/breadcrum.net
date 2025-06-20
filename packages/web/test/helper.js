// This file contains code that we reuse
// between our tests.

/**
 * @import { TestContext } from 'node:test'
 * @import { FastifyInstance } from 'fastify'
*/

import helper from 'fastify-cli/helper.js'
import path from 'path'

const __dirname = import.meta.dirname
const AppPath = path.join(__dirname, '../app.js')

// Fill in this config with all the configurations
// needed for testing the application
function config () {
  return {
    // Disable metrics server in tests to prevent port conflicts
    METRICS: 0,
    // Set test environment flag
    NODE_TEST_CONTEXT: 1,
    // Add required JWT and cookie secrets for tests
    JWT_SECRET: 'test-jwt-secret-for-unit-tests',
    COOKIE_SECRET: 'test-cookie-secret-for-unit-tests'
  }
}

// automatically build and tear down our instance
/**
 * Automatically build and tear down our instance
 * @param {TestContext} t - Test context instance
 * @returns {Promise<FastifyInstance>}
 */
async function build (t) {
  // Set environment variable for tests
  process.env['NODE_TEST_CONTEXT'] = '1'

  // you can set all the options supported by the fastify CLI command
  const argv = [AppPath]

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup

  /**
   * @type {FastifyInstance}
   */
  const app = await helper.build(argv, config())

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
