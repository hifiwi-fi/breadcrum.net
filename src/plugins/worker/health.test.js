import test from 'node:test'
import assert from 'node:assert'
import { createApp } from '#test/helper.js'

test('healthcheck baseline test', { concurrency: false, timeout: 30000 }, async (t) => {
  const app = await createApp({ role: 'worker' })
  t.after(() => app.close())
  const res = await app.inject({
    url: '/health',
  })
  assert.strictEqual(res.payload, '{"statusCode":200,"status":"ok"}')
  assert.strictEqual((await app.inject({ url: '/api/user' })).statusCode, 404)
  assert.strictEqual((await app.inject({ url: '/' })).statusCode, 404)
  assert.strictEqual(app.hasDecorator('jwt'), false)
  assert.strictEqual(app.hasDecorator('sendMail'), false)
  assert.strictEqual(Object.keys(app.pgboss.workers).length, 5)
})
