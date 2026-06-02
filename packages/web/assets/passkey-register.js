/// <reference lib="dom" />

/**
 * @typedef {object} WebAuthnClient
 * @property {() => boolean} isAvailable
 * @property {(options: Record<string, unknown>) => Promise<Record<string, unknown>>} register
 */

const passkeyRegisterState = getPasskeyRegisterState()

if (!passkeyRegisterState.listenersAttached) {
  document.body?.addEventListener('submit', handlePasskeyRegisterSubmit, true)
  passkeyRegisterState.listenersAttached = true
}

/**
 * @param {SubmitEvent} event
 * @returns {void}
 */
function handlePasskeyRegisterSubmit (event) {
  const target = event.target
  if (!(target instanceof globalThis.Element)) return

  const form = target.closest('[data-bc-passkey-register]')
  if (!(form instanceof globalThis.HTMLFormElement)) return

  event.preventDefault()

  if (passkeyRegisterState.running) return

  passkeyRegisterState.running = true
  setFormDisabled(form, true)
  clearError(form)

  registerPasskey(form)
    .then(() => {
      globalThis.location.assign('/account/?message=Passkey%20registered.')
    })
    .catch(err => {
      const error = /** @type {Error} */ (err)
      showError(form, error.message)
    })
    .finally(() => {
      passkeyRegisterState.running = false
      setFormDisabled(form, false)
    })
}

/**
 * @param {HTMLFormElement} form
 * @returns {Promise<void>}
 */
async function registerPasskey (form) {
  const client = await loadWebAuthnClient()
  if (!client.isAvailable()) {
    throw new Error('WebAuthn is not available in this browser')
  }

  const formData = new FormData(form)
  const name = String(formData.get('name') ?? '').trim()
  const userId = form.dataset['bcUserId'] ?? ''
  const username = form.dataset['bcUsername'] ?? ''

  if (!name || name.length > 100) {
    throw new Error('Passkey names must be 1 to 100 characters')
  }

  if (!userId || !username) {
    throw new Error('Missing account context')
  }

  const challengeResponse = await fetch('/api/user/passkeys/register/challenge', {
    method: 'POST',
  })

  if (!challengeResponse.ok) {
    throw new Error(`Failed to get passkey challenge: ${challengeResponse.status} ${challengeResponse.statusText}`)
  }

  const challengeBody = await challengeResponse.json()
  const challenge = typeof challengeBody.challenge === 'string' ? challengeBody.challenge : ''
  if (!challenge) {
    throw new Error('Passkey challenge response was invalid')
  }

  const registration = await client.register({
    user: {
      id: userId,
      name: username,
      displayName: username,
    },
    challenge,
    userVerification: 'required',
    timeout: 60000,
    attestation: false,
  })

  const verifyResponse = await fetch('/api/user/passkeys/register/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      registration: {
        ...registration,
        challenge,
      },
      name,
    }),
  })

  if (!verifyResponse.ok) {
    throw new Error(`Failed to verify passkey registration: ${verifyResponse.status} ${verifyResponse.statusText}`)
  }
}

/**
 * @returns {Promise<WebAuthnClient>}
 */
async function loadWebAuthnClient () {
  // @ts-expect-error This package file is copied next to passkey-register.js by scripts/build-assets.js.
  const module = await import('./webauthn.min.js')
  const webauthn = /** @type {{ client?: WebAuthnClient }} */ (module)

  if (!webauthn.client) {
    throw new Error('WebAuthn client failed to load')
  }

  return webauthn.client
}

/**
 * @param {HTMLFormElement} form
 * @param {boolean} disabled
 * @returns {void}
 */
function setFormDisabled (form, disabled) {
  for (const element of form.elements) {
    if (element instanceof globalThis.HTMLButtonElement || element instanceof globalThis.HTMLInputElement) {
      element.disabled = disabled
    }
  }
}

/**
 * @param {HTMLFormElement} form
 * @returns {void}
 */
function clearError (form) {
  const errorElement = form.querySelector('[data-bc-passkey-register-error]')
  if (!(errorElement instanceof globalThis.HTMLElement)) return

  errorElement.textContent = ''
  errorElement.hidden = true
}

/**
 * @param {HTMLFormElement} form
 * @param {string} message
 * @returns {void}
 */
function showError (form, message) {
  const errorElement = form.querySelector('[data-bc-passkey-register-error]')
  if (!(errorElement instanceof globalThis.HTMLElement)) return

  errorElement.textContent = message
  errorElement.hidden = false
}

/**
 * @returns {{ listenersAttached: boolean, running: boolean }}
 */
function getPasskeyRegisterState () {
  const browserWindow = /** @type {Window & { __bcPasskeyRegister?: { listenersAttached: boolean, running: boolean } }} */ (window)
  browserWindow.__bcPasskeyRegister ??= {
    listenersAttached: false,
    running: false,
  }
  return browserWindow.__bcPasskeyRegister
}
