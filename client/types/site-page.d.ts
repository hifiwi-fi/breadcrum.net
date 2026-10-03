import type { LayoutRegistryName, PageForLayout, ValidatePageVars } from '@domstack/static/types.js'
import type { GlobalVars } from '../globals/global.vars.js'

/** Renderer contract inferred from the site's registered layout chain and globals. */
export type SitePage<
  Name extends LayoutRegistryName,
  Vars extends object = {},
  Data extends object = Record<string, never>
> = PageForLayout<Name, Vars, Data, GlobalVars>

/** Checks actual supplied vars, rather than assuming the renderer's requirements exist. */
export type SitePageVars<
  Name extends LayoutRegistryName,
  Vars extends object
> = ValidatePageVars<Name, Vars, GlobalVars>
