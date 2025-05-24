import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../test/helper.js'

await suite('User API Tests', async () => {
  await test('default root route', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/api/user',
    })
    assert.deepStrictEqual(JSON.parse(res.payload), {
      statusCode: 401,
      code: 'FST_JWT_NO_AUTHORIZATION_IN_COOKIE',
      error: 'Unauthorized',
      message: 'No Authorization was found in request.cookies',
    })
  })
})
