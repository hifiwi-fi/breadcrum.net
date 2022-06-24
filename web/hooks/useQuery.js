import { useCallback, createContext, useContext } from 'uland-isomorphic'
import { useWindow } from './useWindow.js'

const QueryContext = createContext()

if (typeof window !== 'undefined') {
  QueryContext.provide(new URLSearchParams(window.location.search))
  console.log('adding listner')
  window.addEventListener('popstate', (ev) => {
    QueryContext.provide(new URLSearchParams(window.location.search))
  })
}

export function useQuery () {
  const window = useWindow()
  const query = useContext(QueryContext)

  const pushState = useCallback((url) => {
    const searchParams = (new URL(url)).search
    QueryContext.provide(searchParams)
    window.history.pushState({}, '', url)
  }, [window])

  return { query, pushState }
}
