/// <reference lib="dom" />

import { test, suite } from 'node:test'
import assert from 'node:assert'
import { Page } from './client.js'
import { QueryProvider } from '#client/lib/query-provider.js'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { render as renderDOM } from 'preact'
import { act } from 'preact/test-utils'
import { JSDOM } from 'jsdom'

suite('Login Page Tests', () => {
  test('Login page component renders without errors', async () => {
    let rendered
    assert.doesNotThrow(() => {
      rendered = render(html`<${QueryProvider}><${Page}/><//>`)
    }, 'page renders without error')
    assert.strictEqual(typeof rendered, 'string', 'page renders to string')
  })

  test('login only disables the form during final password or passkey requests', async t => {
    const dom = new JSDOM('<main></main>', { url: 'http://example.com/login' })
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    const credentialDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'PublicKeyCredential')
    const credentialAPI = { isConditionalMediationAvailable: async () => true }
    Object.defineProperty(dom.window, 'PublicKeyCredential', { value: credentialAPI })
    Object.defineProperty(globalThis, 'PublicKeyCredential', { configurable: true, value: credentialAPI })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document })
    const container = dom.window.document.querySelector('main')
    assert.ok(container)
    t.after(async () => {
      await act(() => { renderDOM(null, container) })
      dom.window.close()
      for (const [key, descriptor] of /** @type {const} */ ([
        ['window', windowDescriptor],
        ['document', documentDescriptor],
        ['navigator', navigatorDescriptor],
        ['PublicKeyCredential', credentialDescriptor],
      ])) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else Reflect.deleteProperty(globalThis, key)
      }
    })

    const challenge = Promise.withResolvers()
    const authentication = Promise.withResolvers()
    /** @type {PromiseWithResolvers<Response>} */
    const passwordResponse = Promise.withResolvers()
    /** @type {PromiseWithResolvers<Response>} */
    const verifyResponse = Promise.withResolvers()
    const authenticateMock = t.mock.fn(() => authentication.promise)
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { credentials: { get: authenticateMock } },
    })
    t.mock.method(console, 'debug', () => {})
    t.mock.method(console, 'error', () => {})
    t.mock.method(console, 'log', () => {})
    const fetchMock = t.mock.method(globalThis, 'fetch', /** @param {RequestInfo | URL} url */ async url => {
      switch (url) {
        case '/api/user': return new Response(null, { status: 401 })
        case '/api/user/passkeys/authenticate/challenge':
          await challenge.promise
          return Response.json({ challenge: 'dGVzdA' })
        case '/api/login': return passwordResponse.promise
        case '/api/user/passkeys/authenticate/verify': return verifyResponse.promise
        default: throw new Error(`Unexpected request: ${url}`)
      }
    })

    await act(async () => { renderDOM(html`<${QueryProvider}><${Page}/><//>`, container) })
    await t.waitFor(async () => {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
      return fetchMock.mock.calls.some(call => call.arguments[0] === '/api/user/passkeys/authenticate/challenge')
    })
    const fieldset = container.querySelector('fieldset')
    assert.ok(fieldset)
    assert.strictEqual(fieldset.disabled, false, 'challenge retrieval does not lock the form')

    await act(async () => { challenge.resolve(undefined) })
    await t.waitFor(async () => {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
      return authenticateMock.mock.callCount() === 1
    })
    assert.strictEqual(fieldset.disabled, false, 'waiting for passkey autocomplete does not lock the form')

    const form = container.querySelector('form')
    const username = container.querySelector('input[name="user"]')
    const password = container.querySelector('input[name="password"]')
    assert.ok(form)
    assert.ok(username instanceof dom.window.HTMLInputElement)
    assert.ok(password instanceof dom.window.HTMLInputElement)
    username.value = 'test-user'
    password.value = 'test-password'
    await act(async () => { form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })) })
    assert.ok(fetchMock.mock.calls.some(call => call.arguments[0] === '/api/login'))
    assert.strictEqual(fieldset.disabled, true, 'password submission locks the form while a passkey prompt is pending')

    await act(async () => { passwordResponse.resolve(new Response('Invalid password', { status: 401 })) })
    await t.waitFor(async () => {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
      return !fieldset.disabled
    })
    assert.strictEqual(fieldset.disabled, false, 'a failed password login unlocks the form')

    await act(async () => {
      authentication.resolve({
        id: 'test-credential',
        rawId: new ArrayBuffer(0),
        response: {
          clientDataJSON: new ArrayBuffer(0),
          authenticatorData: new ArrayBuffer(0),
          signature: new ArrayBuffer(0),
        },
        getClientExtensionResults: () => ({}),
        type: 'public-key',
      })
    })
    assert.ok(fetchMock.mock.calls.some(call => call.arguments[0] === '/api/user/passkeys/authenticate/verify'))
    await t.waitFor(async () => {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
      return fieldset.disabled
    })
    assert.strictEqual(fieldset.disabled, true, 'passkey verification locks the form')

    await act(async () => { verifyResponse.resolve(new Response('Invalid passkey', { status: 401 })) })
    await t.waitFor(async () => {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
      return !fieldset.disabled
    })
    assert.strictEqual(fieldset.disabled, false, 'a failed passkey verification unlocks the form')
  })

  test('login without WebAuthn does not start conditional mediation or disable password login', async t => {
    const dom = new JSDOM('<main></main>', { url: 'http://example.com/login' })
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    const credentialDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'PublicKeyCredential')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document })
    Reflect.deleteProperty(globalThis, 'PublicKeyCredential')
    const container = dom.window.document.querySelector('main')
    assert.ok(container)
    t.after(async () => {
      await act(() => { renderDOM(null, container) })
      dom.window.close()
      for (const [key, descriptor] of /** @type {const} */ ([
        ['window', windowDescriptor],
        ['document', documentDescriptor],
        ['PublicKeyCredential', credentialDescriptor],
      ])) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else Reflect.deleteProperty(globalThis, key)
      }
    })
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 401 }))
    const errorMock = t.mock.method(console, 'error', () => {})

    await act(async () => { renderDOM(html`<${QueryProvider}><${Page}/><//>`, container) })

    assert.ok(fetchMock.mock.callCount() > 0, 'checks the existing login session')
    assert.ok(fetchMock.mock.calls.every(call => call.arguments[0] === '/api/user'), 'does not request a passkey challenge')
    assert.strictEqual(errorMock.mock.callCount(), 0, 'unsupported WebAuthn is not an authentication failure')
    assert.strictEqual(container.querySelector('fieldset')?.disabled, false)
    assert.ok(container.querySelector('input[name="password"]'))
    assert.ok(!container.textContent?.includes('PublicKeyCredential'))
  })
})
