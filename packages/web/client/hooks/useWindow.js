/// <reference lib="dom" />
/* eslint-env browser */
import { useEffect, useState } from 'preact/hooks'

/**
 * Hook to safely access the window object in both browser and server environments
 * @returns {Window | null} The window object or null if in a non-browser environment
 */
export function useWindow () {
  /** @type {Window | null} */
  const wr = (typeof window !== 'undefined') ? window : null

  const [w, setW] = useState(wr)

  useEffect(() => {
    setW(wr)
  }, [wr])

  return w
}
