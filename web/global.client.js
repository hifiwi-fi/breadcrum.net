import { toggleTheme } from 'mine.css'
import 'fragmentions'

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
