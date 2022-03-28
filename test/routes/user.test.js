import { test } from 'tap'
import { build } from '../helper.js'

test('default root route', async (t) => {
  const app = build(t)

  const res = await app.inject({
    url: '/api/user'
  })
  t.same(res.payload, JSON.stringify({
    statusCode: 401,
    error: 'Unauthorized',
    message: 'No Authorization was found in request.cookies'
  }))
})
