import { Component, html } from 'uland-isomorphic'
import cn from 'classnames'

export const breadcrumb = Component(({
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
})

const relativePathSegment = '../'
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
