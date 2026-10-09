/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useState, useCallback } from 'preact/hooks'
import { usePasskeys } from '../../hooks/usePasskeys.js'
import { PasskeyList } from '../../components/passkey/passkey-list.js'
import { PasskeyRegisterForm } from '../../components/passkey/passkey-register-form.js'
import { tc } from '../../lib/typed-component.js'

/**
 * @typedef {{}} PasskeysFieldProps
 */

/**
 * @type {FunctionComponent<PasskeysFieldProps>}
 */
export const PasskeysField = () => {
  const {
    passkeys,
    loading,
    error,
    registerPasskey,
    updatePasskey,
    deletePasskey
  } = usePasskeys()

  const [isCreating, setIsCreating] = useState(false)

  const passkeyCount = passkeys?.length ?? 0
  const canAddMore = passkeyCount < 10

  const handleStartCreate = useCallback(() => {
    setIsCreating(true)
  }, [])

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false)
  }, [])

  const handleRegister = useCallback(async (/** @type {string} */ name) => {
    await registerPasskey(name)
    setIsCreating(false)
  }, [registerPasskey])

  return html`
    <dt>Passkeys</dt>
    <dd>
      <div class="bc-help-text">
        Passkeys let you sign in with your fingerprint, face, or device PIN.
        They're faster and more secure than passwords. You can register up to 10 passkeys.
      </div>

      <div class="bc-passkey-manage">
        ${isCreating && canAddMore
          ? tc(PasskeyRegisterForm, { onRegister: handleRegister, onCancel: handleCancelCreate })
          : null
        }

        ${!isCreating && canAddMore
          ? html`
            <div class="button-gap">
              <button type="button" onClick=${handleStartCreate}>Add passkey</button>
            </div>
          `
          : null
        }

        ${!canAddMore
          ? html`
            <div class="bc-info-message">
              Maximum of 10 passkeys reached. Delete a passkey to add another.
            </div>
          `
          : null
        }
      </div>

      ${loading && !Array.isArray(passkeys)
        ? html`<div class="bc-loading">Loading passkeys...</div>`
        : null
      }

      ${error
        ? html`<div class="bc-error-message">${error.message}</div>`
        : null
      }

      ${Array.isArray(passkeys) && passkeys.length > 0
        ? tc(PasskeyList, {
          passkeys,
          onUpdate: updatePasskey,
          onDelete: deletePasskey,
        })
        : null
      }
    </dd>
  `
}
