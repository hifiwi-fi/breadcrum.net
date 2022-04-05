import { useState } from 'uland-isomorphic'
import { useWindow } from './useWindow.js'

export function useQuery () {
  const window = useWindow()
  const [query] = useState(new URLSearchParams(window?.document?.location?.search))

  return query
}
