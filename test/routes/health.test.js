import { test } from 'tap'
import { build } from '../helper.js'

test('healthcheck baseline test', async (t) => {
  const app = await build(t)
  const res = await app.inject({
    url: '/health'
  })
  t.equal(res.payload, '{"statusCode":200,"status":"ok"}')
})
