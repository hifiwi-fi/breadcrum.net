/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { VNode, FunctionComponent, RenderableProps } from 'preact'
 */

import { html } from 'htm/preact'

/**
 * Typed component helper for better type checking with HTM
 * @template T
 * @param {FunctionComponent<T>} component
 * @param {T} props
 * @returns {VNode}
 */
export const typedComponent = (component, props) =>
  html`<${component} ...${props} />`
