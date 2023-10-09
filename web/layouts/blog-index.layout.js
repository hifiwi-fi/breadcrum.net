import { html } from 'uland-isomorphic'
import { sep } from 'node:path'
import { breadcrumb } from '../components/breadcrumb/index.js'

import defaultRootLayout from './root.layout.js'

export default function blogIndexLayout (vars) {
  const { children, page, ...rest } = vars
  const pathSegments = page.path.split(sep)
  const wrappedChildren = html`
    ${breadcrumb({ pathSegments })}
    <h1>${vars.title}</h1>
    ${typeof children === 'string'
      ? html([children])
      : children /* Support both uhtml and string children. Optional. */
    }
  `

  return defaultRootLayout({ children: wrappedChildren, ...rest })
}
