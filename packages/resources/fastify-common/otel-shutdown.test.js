import { test } from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { registerOtelShutdown, setOtelSdk } from './otel-shutdown.js'

test('registerOtelShutdown closes the preloaded SDK with Fastify', async () => {
  let shutdownCalls = 0
  setOtelSdk({
    async shutdown () {
      shutdownCalls++
    },
  })
  const app = Fastify({ logger: false })
  registerOtelShutdown(app)
  await app.ready()

  await app.close()

  const secondApp = Fastify({ logger: false })
  registerOtelShutdown(secondApp)
  await secondApp.ready()
  await secondApp.close()

  assert.equal(shutdownCalls, 1)
})
