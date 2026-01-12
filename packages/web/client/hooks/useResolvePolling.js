/// <reference lib="dom" />
/* eslint-env browser */

import { useEffect, useRef } from 'preact/hooks'
import { useWindow } from './useWindow.js'

/**
 * @typedef {object} ResolvePollingOptions
 * @property {boolean} enabled
 * @property {number} [intervalMs]
 * @property {() => Promise<void> | void} onPoll
 */

/**
 * Polls while resolving items exist, stopping once resolved or errored.
 * @param {ResolvePollingOptions} options
 */
export function useResolvePolling ({ enabled, intervalMs = 4000, onPoll }) {
  const window = useWindow()
  const timeoutRef = useRef(/** @type {number | null} */ (null))
  const inflightRef = useRef(false)
  const nextDueRef = useRef(/** @type {number | null} */ (null))
  // Avoid overlapping requests on slow connections while keeping a steady cadence.
  const minDelayMs = 250

  useEffect(() => {
    if (!enabled || !window) return

    let stopped = false

    /** @param {number} delayMs */
    const scheduleNext = (delayMs) => {
      if (stopped) return
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      timeoutRef.current = window.setTimeout(tick, Math.max(delayMs, minDelayMs))
    }

    const tick = async () => {
      if (stopped) return
      if (inflightRef.current) return

      inflightRef.current = true
      try {
        console.debug('Resolve polling tick')
        await onPoll()
      } catch (err) {
        console.error('Resolve polling failed', err)
      } finally {
        inflightRef.current = false
      }

      if (stopped) return
      const now = Date.now()
      nextDueRef.current = nextDueRef.current ?? now
      if (now >= nextDueRef.current) {
        // Deadline missed due to a slow response: run again immediately (with min delay).
        nextDueRef.current = now + intervalMs
        scheduleNext(0)
      } else {
        // On-time response: wait until the next deadline.
        scheduleNext(nextDueRef.current - now)
      }
    }

    nextDueRef.current = Date.now() + intervalMs
    scheduleNext(intervalMs)

    return () => {
      stopped = true
      inflightRef.current = false
      nextDueRef.current = null
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [enabled, intervalMs, onPoll, window])
}
