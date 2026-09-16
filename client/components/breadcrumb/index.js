/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
*/

import { html } from 'htm/preact'
import cn from 'classnames'

/** @type {FunctionComponent<{
 * pathSegments: string[]
}>} */
export const Breadcrumb = ({
  pathSegments,
}) => {
  return html`
  <nav class="bc-breadcrumb-nav" aria-label="breadcrumb">
        <ol class="breadcrumb-list">
            ${pathSegments.map((segment, i, segments) =>
              html`
                <li class="${cn({ 'breadcrumb-item': true, active: segments.length - 1 === i })}">
                  <a href="${generateRelativePathSegment(segment, i, segments.length)}">${segment}</a>
                </li>`
            )}
        </ol>
    </nav>
  `
}

const relativePathSegment = '../'
/**
 * @param {string} segment - The current path segment
 * @param {number} index - The index of the current segment
 * @param {number} segmentLength - The total number of segments
 * @returns {string} The relative path for the segment
 */
function generateRelativePathSegment (segment, index, segmentLength) {
  const segmentCount = segmentLength - index
  if (index === segmentLength - 1) return './'
  const segments = []
  for (let i = 0; i < segmentCount; i++) {
    segments.push(relativePathSegment)
  }
  segments.push(segment)
  return segments.join('')
}
