/// <reference lib="dom" />

import { useEffect, useState } from 'preact/hooks'

/**
 * @param {{ onLine?: boolean | undefined } | undefined} [navigatorLike]
 * @returns {boolean}
 */
export function getOnlineStatus (
  navigatorLike = typeof navigator === 'undefined' ? undefined : navigator
) {
  if (!navigatorLike || typeof navigatorLike.onLine !== 'boolean') {
    return true
  }

  return navigatorLike.onLine
}

/**
 * @returns {boolean}
 */
export function useOnlineStatus () {
  const [online, setOnline] = useState(getOnlineStatus)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => {
      setOnline(getOnlineStatus())
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    updateOnlineStatus()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  return online
}
