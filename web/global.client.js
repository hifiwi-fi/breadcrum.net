import { toggleTheme } from 'mine.css'
import 'fragmentions'
import { render } from 'uland-isomorphic'
import { header } from './components/header.js'

window.toggleTheme = toggleTheme

async function requestStorageAccess () {
  try {
    await document.requestStorageAccess()
    console.log('has storage access')
  } catch (err) {
    console.err(err)
  }
}

requestStorageAccess()

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-header'), header)
}
