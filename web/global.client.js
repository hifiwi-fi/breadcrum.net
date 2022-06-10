import { toggleTheme } from 'mine.css'
import 'fragmentions'
import { render } from 'uland-isomorphic'
import { header } from './components/header/index.js'

window.toggleTheme = toggleTheme

async function requestStorageAccess () {
  try {
    if (document.requestStorageAccess) {
      await document.requestStorageAccess()
      console.log('has storage access')
    } else {
      console.log('requestStorageAccess not supported')
    }
  } catch (err) {
    console.error(err)
  }
}

requestStorageAccess()

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-header'), header)
}
