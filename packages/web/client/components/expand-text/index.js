/// <reference lib="dom" />

/**
 * @import { FunctionComponent, ComponentChild } from 'preact'
 */

import { html } from 'htm/preact'
import { useCallback, useState, useRef, useEffect } from 'preact/hooks'
import cn from 'classnames'

/**
 * @typedef {object} ExpandTextProps
 * @property {ComponentChild} children
 * @property {boolean} [defaultExpandState]
 * @property {string[]} [classNames]
 * @property {boolean} [pre]
 */

/**
 * @type {FunctionComponent<ExpandTextProps>}
 */
export const ExpandText = ({
  children,
  defaultExpandState,
  classNames = [],
  pre,
}) => {
  const contentRef = useRef(/** @type {HTMLDivElement | null} */(null))
  const [expanded, setExpanded] = useState(defaultExpandState)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = contentRef.current
    if (el) {
      setOverflows(el.scrollHeight > el.clientHeight)
    }
  }, [])

  const handleToggle = useCallback((/** @type {MouseEvent} */ ev) => {
    ev.stopPropagation()
    setExpanded(e => !e)
  }, [])

  return html`
    <div class="${
      cn(
        'bc-epand-text',
        {
          'bc-expand-text-expanded': expanded,
          'bc-expand-text-overflows': overflows,
          'bc-expand-text-pre': pre,
        },
        ...classNames
      )
    }">
      <div ref="${contentRef}" class="bc-expand-text-content">
        ${children}
      </div>
      <button class="bc-expand-text-toggle" onClick="${handleToggle}">
        ${expanded ? 'show less' : 'show more'}
      </button>
    </div>
  `
}
