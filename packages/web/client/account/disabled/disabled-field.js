/// <reference lib="dom" />

/** @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js' */
/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'

/**
 * @typedef {{
 *  user: TypeUserRead | null,
 * }} DisabledFieldProps
 */

/**
 * @type {FunctionComponent<DisabledFieldProps>}
 */
export const DisabledField = ({ user }) => {
  return html`
    ${user?.disabled
      ? html`
        <dt><marquee direction="right">Account Disabled</marquee></dt>
        <dd>
          <p>Your account has been disabled${user?.disabled_reason ? html`<span> for the following reason:</span>` : html`<span>.</span>`}</p>
          ${user?.disabled_reason
            ? html`<p>${user?.disabled_reason}</p>`
            : null
          }
          <p>Please contact <a href="mailto:support@breadcrum.net">support@breadcrum.net</a> to resolve this issue.</p>
        </dd>
      `
      : null
    }
  `
}
