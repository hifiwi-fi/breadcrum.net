/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeUserRead } from '../../../routes/api/user/schemas/schema-user-read.js'
 */
// @ts-expect-error
import { Component, html } from 'uland-isomorphic'

/**
 * @typedef {({
 *  user,
 * }: {
 *  user: TypeUserRead | null,
 * }) => any} DisabledField
 */

/**
 * @type {DisabledField}
 */
export const disabledField = Component(/** @type{DisabledField} */({ user }) => {
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
})
