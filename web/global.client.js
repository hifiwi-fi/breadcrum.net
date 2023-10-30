import { toggleTheme } from 'mine.css'
import 'fragmentions'
import { render } from 'uland-isomorphic'
import { loadServiceWorker } from '@siteup/cli/load-service-worker.js'
import { header } from './components/header/index.js'

window.toggleTheme = toggleTheme

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-header'), header)
}

loadServiceWorker()
