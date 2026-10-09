/// <reference lib="dom" />

/**
 * @import { FunctionComponent, ComponentChild } from 'preact'
 */

import { html } from 'htm/preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { useWindow } from '#hooks/useWindow.js'
import cn from 'classnames'

/**
 * Selectors for elements that should keep their native interaction instead of
 * toggling the surrounding expandable text block.
 */
const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, summary, [role="button"]'

/**
 * CSS custom property used as the source of truth for the collapsed height.
 * Keeping this value in CSS lets the visual styling own the default layout,
 * while JS reads it only to decide whether the content actually overflows.
 */
const COLLAPSED_HEIGHT_PROPERTY = '--bc-expand-text-collapsed-height'

/**
 * @typedef {object} ExpandTextProps
 * @property {ComponentChild} children - Text or rich content to collapse/expand.
 * @property {boolean} [defaultExpandState] - Start expanded, used by detail pages that should show the full text immediately.
 * @property {string[]} [classNames] - Additional classes to merge onto the root element.
 * @property {boolean} [pre] - Preserve line breaks with `white-space: pre-line`.
 */

/**
 * Measurements needed to animate between the collapsed CSS height and the
 * content's real expanded height without using an arbitrary large max-height.
 *
 * @typedef {object} TextMeasurements
 * @property {number} collapsedHeight - The visible height when collapsed.
 * @property {number} expandedHeight - The full content height from `scrollHeight`.
 * @property {boolean} overflows - Whether the content is taller than the collapsed height.
 */

/**
 * Read the collapsed max-height from CSS.
 *
 * This keeps the component's collapsed presentation controlled by CSS while
 * allowing JS to compare the collapsed height against the element's actual
 * scroll height.
 *
 * @param {Window | null | undefined} window
 * @param {HTMLElement} element
 * @returns {number}
 */
function getCollapsedMaxHeight (window, element) {
  const collapsedHeightProperty = window
    ?.getComputedStyle(element)
    .getPropertyValue(COLLAPSED_HEIGHT_PROPERTY) ?? ''
  return Number.parseFloat(collapsedHeightProperty)
}

/**
 * Measure the collapsed and expanded dimensions for the text block.
 *
 * The expanded height uses `scrollHeight`, avoiding the old `9999px` max-height
 * hack that caused browser scrolling issues. The collapsed height is clamped to
 * the smaller of the CSS max-height and the content height, so short content is
 * treated as non-expandable.
 *
 * @param {Window | null | undefined} window
 * @param {HTMLElement} element
 * @returns {TextMeasurements}
 */
function measureText (window, element) {
  const collapsedMaxHeight = getCollapsedMaxHeight(window, element)
  const expandedHeight = element.scrollHeight
  const collapsedHeight = Number.isFinite(collapsedMaxHeight)
    ? Math.min(expandedHeight, collapsedMaxHeight)
    : element.clientHeight

  return {
    collapsedHeight,
    expandedHeight,
    overflows: expandedHeight > collapsedHeight,
  }
}

/**
 * Determine whether a click should be handled by an interactive child element
 * instead of toggling the expandable text container.
 *
 * The root element itself may have `role="button"` for keyboard accessibility,
 * so this intentionally ignores the root and only treats descendants as
 * interactive click targets.
 *
 * @param {MouseEvent} ev
 * @param {HTMLElement | null} rootElement
 * @returns {boolean}
 */
function isInteractiveDescendantClick (ev, rootElement) {
  const target = ev.target
  if (!(target instanceof Element)) return false

  const interactiveElement = target.closest(INTERACTIVE_SELECTOR)
  return Boolean(interactiveElement && interactiveElement !== rootElement)
}

/**
 * Collapsible text block that preserves the original click-anywhere visual feel
 * while measuring its real expanded height.
 *
 * The component stays visually lightweight: overflowing text gets a subtle CSS
 * fade and the whole block toggles when clicked. JS is only used to measure the
 * actual expanded height, detect whether the text overflows, and add keyboard
 * accessibility (`role="button"`, `tabIndex`, and `aria-expanded`) when the
 * block is genuinely expandable.
 *
 * @type {FunctionComponent<ExpandTextProps>}
 */
export const ExpandText = ({
  children,
  defaultExpandState,
  classNames = [],
  pre,
}) => {
  const browserWindow = useWindow()
  const expandRef = useRef(/** @type {HTMLDivElement | null} */(null))
  const [expanded, setExpanded] = useState(Boolean(defaultExpandState))
  const [overflows, setOverflows] = useState(false)
  const [collapsedHeight, setCollapsedHeight] = useState(/** @type {number | null} */(null))
  const [expandedHeight, setExpandedHeight] = useState(/** @type {number | null} */(null))

  /**
   * Refresh measurements whenever the block changes size or receives new
   * children. ResizeObserver catches late layout changes such as fonts, images,
   * or responsive reflow.
   */
  const updateMeasurements = useCallback(() => {
    const element = expandRef.current
    if (!element) return

    const nextMeasurements = measureText(browserWindow, element)
    setCollapsedHeight(nextMeasurements.collapsedHeight)
    setExpandedHeight(nextMeasurements.expandedHeight)
    setOverflows(nextMeasurements.overflows)
  }, [browserWindow])

  useEffect(() => {
    const element = expandRef.current
    if (!element) return

    updateMeasurements()
    const observer = new ResizeObserver(updateMeasurements)
    observer.observe(element)
    return () => observer.disconnect()
  }, [children, updateMeasurements])

  /**
   * Preserve the original text-selection behavior: selecting text inside the
   * block should not also toggle expansion when the mouse is released.
   */
  const getSelectedText = useCallback(() => {
    const selection = browserWindow?.getSelection()
    const anchorNode = selection?.anchorNode
    if (expandRef.current && anchorNode && expandRef.current.contains(anchorNode)) {
      return selection?.toString() ?? ''
    }
    return ''
  }, [browserWindow])

  const toggleExpanded = useCallback(() => {
    setExpanded(currentExpanded => !currentExpanded)
  }, [])

  /**
   * Toggle only for meaningful container clicks: the block must overflow,
   * interactive descendants keep their native behavior, and selecting text does
   * not count as an expand/collapse action.
   */
  const handleClick = useCallback((/** @type {MouseEvent} */ ev) => {
    if (!overflows) return
    if (isInteractiveDescendantClick(ev, expandRef.current)) return
    if (getSelectedText() !== '') return

    toggleExpanded()
  }, [getSelectedText, overflows, toggleExpanded])

  /**
   * Keyboard path for the clickable container. Enter and Space mirror native
   * button activation when the content is expandable.
   */
  const handleKeyDown = useCallback((/** @type {KeyboardEvent} */ ev) => {
    if (!overflows || ev.defaultPrevented) return
    if (ev.key !== 'Enter' && ev.key !== ' ') return

    ev.preventDefault()
    toggleExpanded()
  }, [overflows, toggleExpanded])

  const canExpand = overflows
  const isExpanded = expanded && canExpand

  // Detail pages can render expanded by default; suppress the initial transition
  // so those pages do not animate open on load.
  const suppressTransition = Boolean(defaultExpandState) && isExpanded

  // Only write inline max-height when expanding overflowing content. Collapsed
  // and non-overflowing blocks remain governed entirely by CSS.
  const expandedStyle = isExpanded && collapsedHeight != null && expandedHeight != null
    ? `max-height: ${expandedHeight}px`
    : ''

  return html`
    <div
      ref="${expandRef}"
      role="${canExpand ? 'button' : null}"
      tabIndex="${canExpand ? 0 : null}"
      aria-expanded="${canExpand ? String(isExpanded) : null}"
      onClick="${handleClick}"
      onKeyDown="${handleKeyDown}"
      style="${expandedStyle}"
      class="${
        cn(
          'bc-expand-text',
          {
            'bc-expand-text-expanded': isExpanded,
            'bc-expand-text-no-transition': suppressTransition,
            'bc-expand-text-overflows': canExpand,
            'bc-expand-text-pre': pre,
          },
          ...classNames
        )
      }">
        ${children}
      </div>
  `
}
