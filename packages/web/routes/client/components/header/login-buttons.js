/**
 * @import { FunctionComponent } from 'preact'
 */
import { html } from 'htm/preact'
import { useWindow } from '../../hooks/useWindow.js'

/** @type{FunctionComponent<{}>} */
export const LoginButtons = () => {
  const window = useWindow()

  return html`
    ${
      window?.location?.pathname !== '/login/'
        ? html`
          <div>
            <a href='/login'>login</a>
          </div>
        `
        : null
    }
    ${
      window?.location?.pathname !== '/login/' && window?.location?.pathname !== '/register/'
        ? html`
          <div>/</div>
        `
        : null
    }
    ${
      window?.location?.pathname !== '/register/'
        ? html`
          <div>
            <a href='/register'>register</a>
          </div>
        `
        : null
    }
    ${window?.location?.pathname === '/login/'
      ? html`<div></div>`
      : null
    }
  `
}
