import { useEffect, useState } from 'uland-isomorphic'

export function useWindow () {
  const wr = (typeof window !== 'undefined') ? window : null
  const [w, setW] = useState(wr)

  useEffect(() => {
    setW(wr)
  }, [wr])

  return w
}
