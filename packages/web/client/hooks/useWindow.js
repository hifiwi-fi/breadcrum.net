// @ts-ignore
import { useEffect, useState } from 'uland-isomorphic'

/**
 * Hook to safely access the window object in both browser and server environments
 * @returns {Window | null} The window object or null if in a non-browser environment
 */
export function useWindow () {
  /** @type {Window | null} */
  const wr = (typeof window !== 'undefined') ? window : null
  /** @type {[Window | null, (window: Window | null) => void]} */
  const [w, setW] = useState(wr)

  useEffect(() => {
    setW(wr)
  }, [wr])

  return w
}
