import { toggleTheme } from 'mine.css'
import 'fragmentions'
import { render } from 'uland-isomorphic'
import { header } from '../components/header/index.js'

window.toggleTheme = toggleTheme

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-header'), header)
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
}
