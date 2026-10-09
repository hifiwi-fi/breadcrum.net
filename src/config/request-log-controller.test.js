import { test } from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { RequestLogController } from './request-log-controller.js'

for (const disableRequestLogging of [false, true]) {
  test(`request log controller emits one access record (disabled: ${disableRequestLogging})`, async t => {
    /** @type {string[]} */
    const lines = []
    const app = Fastify({
      logger: {
        level: 'info',
        stream: { write (line) { lines.push(line) } },
      },
      logController: new RequestLogController({ disableRequestLogging }),
    })
    t.after(() => app.close())

    app.get('/items/:id', async () => ({ ok: true }))
    await app.inject('/items/42')

    const records = lines.map(line => JSON.parse(line))
    if (disableRequestLogging) {
      assert.deepEqual(records, [])
      return
    }

    assert.equal(records.length, 1)
    assert.equal(records[0].msg, 'request completed')
    assert.equal(records[0].req.method, 'GET')
    assert.equal(records[0].req.url, '/items/42')
    assert.equal(records[0].route, '/items/:id')
    assert.equal(records[0].res.statusCode, 200)
    assert.equal(typeof records[0].responseTime, 'number')
  })
}
