import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../test/helper.js'

await suite('Health Endpoint Tests', { concurrency: false, timeout: 30000 }, async () => {
  await test('healthcheck baseline test', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/health',
    })
    assert.strictEqual(res.payload, '{"statusCode":200,"status":"ok"}')
  })
})
