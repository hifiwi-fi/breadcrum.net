// This file contains code that we reuse
// between our tests.

/**
 * @import { TestContext } from 'node:test'
*/

import helper from 'fastify-cli/helper.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AppPath = path.join(__dirname, '..', 'app.js')

// Fill in this config with all the configurations
// needed for testing the application
function config () {
  return {}
}

/**
 * Automatically build and tear down our instance
 * @param {TestContext} t - Test context instance
 */
async function build (t) {
  // you can set all the options supported by the fastify CLI command
  const argv = [AppPath]

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  const app = await helper.build(argv, config())

  // tear down our app after we are done
  t.after(async () => {
    await app.close()
  })

  await app.ready()
  return app
}

export {
  config,
  build,
}
