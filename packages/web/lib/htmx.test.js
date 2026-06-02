import { test, suite } from 'node:test'
import assert from 'node:assert'
import {
  formError,
  fragmentIdFromTarget,
  getHtmxContext,
  isHtmxRequest,
  normalizeFormErrors,
  redirectForRequest,
  safeRedirectPath,
  setHtmxLocation,
  setHtmxPushUrl,
  setHtmxReplaceUrl,
} from './htmx.js'

await suite('htmx helpers', async () => {
  await test('detects htmx request context', () => {
    const request = requestWithHeaders({
      'hx-request': 'true',
      'hx-target': 'bc-main',
      'hx-request-type': 'event',
    })

    assert.strictEqual(isHtmxRequest(request), true)
    assert.deepStrictEqual(getHtmxContext(request), {
      isHtmx: true,
      target: 'bc-main',
      requestType: 'event',
    })
  })

  await test('maps htmx targets to typed fragment IDs', () => {
    const fragmentId = fragmentIdFromTarget(requestWithHeaders({
      'hx-target': 'bc-main',
    }), {
      'bc-main': 'main',
    }, null)

    assert.strictEqual(fragmentId, 'main')
  })

  await test('sets htmx navigation headers', () => {
    const reply = fakeReply()

    setHtmxLocation(asFastifyReply(reply), '/next')
    setHtmxPushUrl(asFastifyReply(reply), '/push')
    setHtmxReplaceUrl(asFastifyReply(reply), '/replace')

    assert.deepStrictEqual(reply.headers, {
      'HX-Location': '/next',
      'HX-Push-Url': '/push',
      'HX-Replace-Url': '/replace',
    })
  })

  await test('uses HX-Redirect for htmx redirects', () => {
    const reply = fakeReply()
    redirectForRequest(requestWithHeaders({ 'hx-request': 'true' }), asFastifyReply(reply), '/login/')

    assert.strictEqual(reply.statusCode, 204)
    assert.strictEqual(reply.headers['HX-Redirect'], '/login/')
    assert.strictEqual(reply.redirectUrl, null)
  })

  await test('uses normal redirects for normal browser redirects', () => {
    const reply = fakeReply()
    redirectForRequest(requestWithHeaders({}), asFastifyReply(reply), '/login/')

    assert.strictEqual(reply.redirectUrl, '/login/')
    assert.strictEqual(reply.headers['HX-Redirect'], undefined)
  })

  await test('normalizes form errors', () => {
    assert.deepStrictEqual(normalizeFormErrors([
      'Required',
      new Error('Invalid'),
      formError('Bad URL', 'url'),
    ]), [
      { field: null, message: 'Required' },
      { field: null, message: 'Invalid' },
      { field: 'url', message: 'Bad URL' },
    ])
  })

  await test('normalizes redirect targets to same-site paths', () => {
    assert.strictEqual(safeRedirectPath('/bookmarks/?page=2', '/'), '/bookmarks/?page=2')
    assert.strictEqual(safeRedirectPath('https://example.com/admin/#top', '/'), '/admin/#top')
    assert.strictEqual(safeRedirectPath('', '/bookmarks/'), '/bookmarks/')
  })
})

/**
 * @param {Record<string, string>} headers
 * @returns {import('fastify').FastifyRequest}
 */
function requestWithHeaders (headers) {
  return /** @type {import('fastify').FastifyRequest} */ ({
    headers,
  })
}

/**
 * @typedef {object} FakeReply
 * @property {Record<string, string>} headers
 * @property {number | null} statusCode
 * @property {string | null} redirectUrl
 * @property {(name: string, value: string) => FakeReply} header
 * @property {(statusCode: number) => FakeReply} status
 * @property {(url: string) => FakeReply} redirect
 */

/**
 * @returns {FakeReply}
 */
function fakeReply () {
  /** @type {FakeReply} */
  const reply = {
    headers: {},
    statusCode: null,
    redirectUrl: null,
    header (name, value) {
      reply.headers[name] = value
      return reply
    },
    status (statusCode) {
      reply.statusCode = statusCode
      return reply
    },
    redirect (url) {
      reply.redirectUrl = url
      return reply
    },
  }

  return reply
}

/**
 * @param {FakeReply} reply
 * @returns {import('fastify').FastifyReply}
 */
function asFastifyReply (reply) {
  return /** @type {import('fastify').FastifyReply} */ (/** @type {unknown} */ (reply))
}
