import { test } from 'tap'
import { build } from '../../../test/helper.js'

test('default root route', async (t) => {
  const app = await build(t)
  const res = await app.inject({
    url: '/api/user',
  })
  t.same(res.payload, JSON.stringify({
    statusCode: 401,
    code: 'FST_JWT_NO_AUTHORIZATION_IN_COOKIE',
    error: 'Unauthorized',
    message: 'No Authorization was found in request.cookies',
  }))
})
