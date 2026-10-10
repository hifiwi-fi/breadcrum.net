import assert from 'node:assert/strict'
import { test } from 'node:test'
import Fastify from 'fastify'
import auth from '@fastify/auth'
import jwt from '@fastify/jwt'
import sensible from '@fastify/sensible'
import { postBillingPortal } from './post-portal.js'

/** @import { TestContext } from 'node:test' */

/** @param {TestContext} t */
async function buildPortal (t) {
  const app = Fastify()
  t.after(() => app.close())
  await app.register(auth)
  await app.register(jwt, { secret: 'portal-test-secret' })
  await app.register(sensible)
  app.decorate('verifyJWT', async function (request) { await request.jwtVerify() })
  app.decorate('notDisabled', async function () { throw app.httpErrors.forbidden('User disabled') })
  // Keep the isolated route fixture limited to the dependencies this handler uses.
  Object.defineProperty(app, 'config', { value: { TRANSPORT: 'https', HOST: 'example.com' } })
  app.decorate('getFlags', async () => ({ billing_enabled: true }))
  const query = t.mock.fn(async (/** @type {{ values: unknown[] }} */ _query) => ({ rows: [{ stripe_customer_id: 'cus_existing' }] }))
  Object.defineProperty(app, 'pg', { value: { query } })
  const create = t.mock.fn(async (/** @type {{ customer: string, return_url: string }} */ _params) => ({ url: 'https://billing.stripe.com/test-session' }))
  Object.defineProperty(app, 'billing', { value: { stripe: { billingPortal: { sessions: { create } } } } })
  await app.register(postBillingPortal)
  await app.ready()
  return { app, query, create }
}

test('disabled authenticated customer can open the portal for their own customer mapping', async t => {
  const { app, query, create } = await buildPortal(t)
  const token = app.jwt.sign({ id: 'disabled-user', username: 'disabled-user', jti: 'test-token' })
  const response = await app.inject({ method: 'POST', url: '/portal', headers: { authorization: `Bearer ${token}` } })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { url: 'https://billing.stripe.com/test-session' })
  assert.equal(query.mock.callCount(), 1)
  assert.deepEqual(query.mock.calls[0]?.arguments[0]?.values, ['disabled-user'])
  assert.equal(create.mock.callCount(), 1)
  assert.deepEqual(create.mock.calls[0]?.arguments, [{ customer: 'cus_existing', return_url: 'https://example.com/account/' }])
})

test('portal still rejects unauthenticated and invalid tokens without looking up customers', async t => {
  const { app, query, create } = await buildPortal(t)
  for (const headers of [{}, { authorization: 'Bearer invalid' }]) {
    const response = await app.inject({ method: 'POST', url: '/portal', headers })
    assert.equal(response.statusCode, 401)
  }
  assert.equal(query.mock.callCount(), 0)
  assert.equal(create.mock.callCount(), 0)
})

test('disabled authenticated user without a customer mapping cannot create a portal', async t => {
  const { app, query, create } = await buildPortal(t)
  query.mock.mockImplementation(async () => ({ rows: [] }))
  const token = app.jwt.sign({ id: 'disabled-user', username: 'disabled-user', jti: 'test-token' })
  const response = await app.inject({ method: 'POST', url: '/portal', headers: { authorization: `Bearer ${token}` } })
  assert.equal(response.statusCode, 404)
  assert.equal(create.mock.callCount(), 0)
})
