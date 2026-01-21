/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */
/** @import { TypePasskeyReadClient } from '../../../routes/api/user/passkeys/schemas/schema-passkey-read.js' */

import { html } from 'htm/preact'
import { PasskeyItem } from './passkey-item.js'
import { tc } from '../../lib/typed-component.js'

/**
 * @typedef {Object} PasskeyListProps
 * @property {TypePasskeyReadClient[]} passkeys - Array of passkeys to display
 * @property {(id: string, name: string) => Promise<void>} onUpdate - Callback to update passkey
 * @property {(id: string) => Promise<void>} onDelete - Callback to delete passkey
 */

/**
 * @type {FunctionComponent<PasskeyListProps>}
 */
export const PasskeyList = ({ passkeys, onUpdate, onDelete }) => {
  return html`
    <div class="bc-passkey-list">
      ${passkeys.map(passkey =>
        tc(PasskeyItem, {
          passkey,
          onUpdate,
          onDelete,
        }, passkey.id)
      )}
    </div>
  `
}
