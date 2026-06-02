/// <reference lib="dom" />

/**
 * @typedef {object} WebAuthnClient
 * @property {() => Promise<boolean>} isAutocompleteAvailable
 * @property {(options: { challenge: string, autocomplete: true, userVerification: 'required' }) => Promise<Record<string, unknown>>} authenticate
 */

/**
 * @typedef {object} PasskeyLoginState
 * @property {boolean} listenersAttached
 * @property {boolean} running
 */

const passkeyLoginState = getPasskeyLoginState()

if (!passkeyLoginState.listenersAttached) {
  window.addEventListener('DOMContentLoaded', schedulePasskeyLogin)
  document.body?.addEventListener('htmx:afterSwap', schedulePasskeyLogin)
  passkeyLoginState.listenersAttached = true
}

schedulePasskeyLogin()

async function schedulePasskeyLogin () {
  if (passkeyLoginState.running) return
  if (!document.querySelector('[data-bc-passkey-login]')) return
  if (!window.PublicKeyCredential) return

  passkeyLoginState.running = true
  clearPasskeyError()

  try {
    const client = await loadWebAuthnClient()
    const autocompleteAvailable = await client.isAutocompleteAvailable()
    if (!autocompleteAvailable) return

    const challenge = await getChallenge()
    const authentication = await client.authenticate({
      challenge,
      autocomplete: true,
      userVerification: 'required',
    })

    const verifyResponse = await fetch('/api/user/passkeys/authenticate/verify', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        authentication: {
          ...authentication,
          challenge,
        },
      }),
    })

    if (!verifyResponse.ok || verifyResponse.status !== 201) {
      throw new Error(`Passkey login failed: ${verifyResponse.status} ${verifyResponse.statusText} ${await verifyResponse.text()}`)
    }

    window.location.replace(redirectTarget())
  } catch (error) {
    if (!isAbortError(error)) {
      console.error('Passkey login failed:', error)
      showPasskeyError(/** @type {Error} */ (error))
    }
  } finally {
    passkeyLoginState.running = false
  }
}

/**
 * @returns {Promise<WebAuthnClient>}
 */
async function loadWebAuthnClient () {
  // @ts-expect-error This package file is copied next to passkey-login.js by scripts/build-assets.js.
  const module = await import('./webauthn.min.js')
  const webauthn = /** @type {{ client?: WebAuthnClient }} */ (module)

  if (!webauthn.client) {
    throw new Error('Passkey client failed to load')
  }

  return webauthn.client
}

/**
 * @returns {Promise<string>}
 */
async function getChallenge () {
  const challengeResponse = await fetch('/api/user/passkeys/authenticate/challenge', {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
    },
  })

  if (!challengeResponse.ok) {
    throw new Error(`Failed to get passkey challenge: ${challengeResponse.status} ${challengeResponse.statusText}`)
  }

  const body = /** @type {{ challenge?: unknown }} */ (await challengeResponse.json())
  if (typeof body.challenge !== 'string') {
    throw new Error('Passkey challenge response was invalid')
  }

  return body.challenge
}

/**
 * @returns {string}
 */
function redirectTarget () {
  const fallback = '/bookmarks/'
  const currentUrl = new URL(window.location.href)
  const redirect = currentUrl.searchParams.get('redirect')
  if (!redirect) return fallback

  try {
    const redirectUrl = new URL(redirect, window.location.origin)
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}` || fallback
  } catch {
    return fallback
  }
}

function clearPasskeyError () {
  const errorElement = document.querySelector('[data-bc-passkey-error]')
  if (!errorElement || !('hidden' in errorElement)) return

  const htmlElement = /** @type {HTMLElement} */ (errorElement)
  htmlElement.hidden = true
  htmlElement.textContent = ''
}

/**
 * @param {Error} error
 */
function showPasskeyError (error) {
  const errorElement = document.querySelector('[data-bc-passkey-error]')
  if (!errorElement || !('hidden' in errorElement)) return

  const htmlElement = /** @type {HTMLElement} */ (errorElement)
  htmlElement.hidden = false
  htmlElement.textContent = error.message
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isAbortError (error) {
  if (!error || typeof error !== 'object') return false

  const maybeError = /** @type {{ name?: unknown, message?: unknown, cause?: unknown }} */ (error)
  if (maybeError.name === 'AbortError') return true

  if (typeof maybeError.message === 'string' && maybeError.message.includes('AbortError')) {
    return true
  }

  if (maybeError.cause && typeof maybeError.cause === 'object') {
    const maybeCause = /** @type {{ name?: unknown, message?: unknown }} */ (maybeError.cause)
    if (maybeCause.name === 'AbortError') return true
    return typeof maybeCause.message === 'string' && maybeCause.message.includes('AbortError')
  }

  return false
}

/**
 * @returns {PasskeyLoginState}
 */
function getPasskeyLoginState () {
  const windowWithState = /** @type {Window & { __bcPasskeyLogin?: PasskeyLoginState }} */ (window)
  windowWithState.__bcPasskeyLogin ??= {
    listenersAttached: false,
    running: false,
  }

  return windowWithState.__bcPasskeyLogin
}
