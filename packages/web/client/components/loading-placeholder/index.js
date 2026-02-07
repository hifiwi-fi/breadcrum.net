/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'

/**
 * @typedef {object} LoadingPlaceholderProps
 * @property {string} [label]
 * @property {string} [className]
 */

/**
 * @type {FunctionComponent<LoadingPlaceholderProps>}
 */
export const LoadingPlaceholder = ({
  label = 'Loading',
  className = '',
}) => {
  const resolvedClassName = className
    ? `bc-loading-placeholder ${className}`
    : 'bc-loading-placeholder'

  return html`
    <div class=${resolvedClassName} role="status" aria-live="polite" aria-label=${label}>
      <span class="bc-loading-placeholder-spinner" aria-hidden="true">🥖</span>
    </div>
  `
}
