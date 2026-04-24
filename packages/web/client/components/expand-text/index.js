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
  if (defaultExpandState) return children

  const contentRef = useRef(/** @type {HTMLDivElement | null} */(null))
  const [expanded, setExpanded] = useState(false)
  const expandedRef = useRef(false)
  const [lineClamped, setLineClamped] = useState(true)
  const [overflows, setOverflows] = useState(false)
  const [collapsedHeight, setCollapsedHeight] = useState(/** @type {number | null} */(null))
  const [expandedHeight, setExpandedHeight] = useState(/** @type {number | null} */(null))

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const measure = () => {
      if (expandedRef.current) return
      const doesOverflow = el.scrollHeight > el.clientHeight
      setOverflows(doesOverflow)
      if (doesOverflow) {
        setCollapsedHeight(el.clientHeight)
        setExpandedHeight(el.scrollHeight)
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleToggle = useCallback((/** @type {MouseEvent} */ ev) => {
    ev.stopPropagation()
    if (expanded) {
      setExpanded(false)
      setTimeout(() => {
        expandedRef.current = false
        setLineClamped(true)
      }, 300)
    } else {
      setLineClamped(false)
      requestAnimationFrame(() => {
        const el = contentRef.current
        if (el) setExpandedHeight(el.scrollHeight)
        expandedRef.current = true
        setExpanded(true)
      })
    }
  }, [expanded])

  return html`
    <div class="${
      cn(
        'bc-epand-text',
        {
          'bc-expand-text-expanded': expanded,
          'bc-expand-text-line-clamped': lineClamped,
          'bc-expand-text-overflows': overflows,
          'bc-expand-text-pre': pre,
        },
        ...classNames
      )
    }">
      <div
        ref="${contentRef}"
        class="bc-expand-text-content"
        style="${overflows && collapsedHeight != null && expandedHeight != null ? `max-height: ${expanded ? expandedHeight : collapsedHeight}px` : ''}">
        ${children}
      </div>
      <button class="bc-expand-text-toggle" onClick="${handleToggle}">
        ${expanded ? 'show less' : 'show more'}
      </button>
    </div>
  `
}
