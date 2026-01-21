/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'

/**
 * @typedef {Object} PasskeyRegisterFormProps
 * @property {(name: string) => Promise<void>} onRegister - Callback to register passkey
 * @property {() => void} [onCancel] - Optional callback to cancel registration
 */

/**
 * @type {FunctionComponent<PasskeyRegisterFormProps>}
 */
export const PasskeyRegisterForm = ({ onRegister, onCancel }) => {
  const [name, setName] = useState('')
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */(null))

  const handleSubmit = useCallback(async (/** @type {Event} */ ev) => {
    ev.preventDefault()

    if (!name.trim()) {
      setError('Please enter a name for your passkey')
      return
    }

    if (name.length > 100) {
      setError('Name must be 100 characters or less')
      return
    }

    setRegistering(true)
    setError(null)

    try {
      await onRegister(name.trim())
      setName('') // Clear form on success
      setError(null)
    } catch (err) {
      console.error('Registration failed:', err)
      const error = /** @type {Error} */ (err)
      setError(error.message || 'Failed to register passkey. Please try again.')
    } finally {
      setRegistering(false)
    }
  }, [name, onRegister])

  const handleNameChange = useCallback((/** @type {Event} */ ev) => {
    const target = /** @type {HTMLInputElement} */ (ev.target)
    setName(target.value)
    setError(null) // Clear error when user types
  }, [])

  return html`
    <form class="bc-passkey-register-form" onSubmit=${handleSubmit}>
      <fieldset disabled=${registering}>
        <legend>Add Passkey</legend>
        <div>
          <label class="block">
            Name:
            <input
              class="block"
              type="text"
              name="name"
              placeholder="e.g., iPhone, YubiKey, Work Laptop"
              value=${name}
              onInput=${handleNameChange}
              maxLength="100"
              required
            />
          </label>
          <span class="bc-help-text">
            Give your passkey a memorable name to identify it later.
          </span>
        </div>
        ${error
          ? html`<div class="bc-error-message" role="alert">${error}</div>`
          : null
        }
        <div class="button-cluster">
          <span>
            <input
              name="submit-button"
              type="submit"
              value=${registering ? 'Registering...' : 'Register Passkey'}
              disabled=${registering || !name.trim()}
            />
          </span>
          ${onCancel
            ? html`
              <span>
                <button
                  type="button"
                  onClick=${onCancel}
                >
                  Cancel
                </button>
              </span>
            `
            : null
          }
        </div>
      </fieldset>
    </form>
  `
}
