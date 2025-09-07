/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { VNode, FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'

/**
 * Typed component helper for better type checking with HTM
 * @template T
 * @param {FunctionComponent<T>} component
 * @param {T} props
 * @param {string | number} [key] - Optional key for React reconciliation
 * @returns {VNode}
 */
export const tc = (component, props, key) =>
  key !== undefined
    ? html`<${component} key=${key} ...${props} />`
    : html`<${component} ...${props} />`
