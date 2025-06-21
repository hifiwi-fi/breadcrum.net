import test from 'node:test'
import assert from 'node:assert'
import { build } from '../test/helper.js'

test('healthcheck baseline test', { concurrency: false, timeout: 30000 }, async (t) => {
  const app = await build(t)
  const res = await app.inject({
    url: '/health',
  })
  assert.strictEqual(res.payload, '{"statusCode":200,"status":"ok"}')
})
