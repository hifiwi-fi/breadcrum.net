import type rootLayout from './layouts/root/root.layout.js'
import type { default as articleLayout, parentLayout as articleParent } from './layouts/article/article.layout.js'
import type { default as docsLayout, parentLayout as docsParent } from './layouts/docs/docs.layout.js'
import type { default as blogIndexLayout, parentLayout as blogIndexParent } from './layouts/blog-index/blog-index.layout.js'
import type { default as blogAutoIndexLayout, parentLayout as blogAutoIndexParent, vars as blogAutoIndexVars } from './layouts/blog-index/blog-auto-index.layout.js'

declare module '@domstack/static/types.js' {
  interface LayoutRegistry {
    root: {
      render: typeof rootLayout
    }
    article: {
      render: typeof articleLayout
      parentLayout: typeof articleParent
    }
    docs: {
      render: typeof docsLayout
      parentLayout: typeof docsParent
    }
    'blog-index': {
      render: typeof blogIndexLayout
      parentLayout: typeof blogIndexParent
    }
    'blog-auto-index': {
      render: typeof blogAutoIndexLayout
      parentLayout: typeof blogAutoIndexParent
      vars: typeof blogAutoIndexVars
    }
  }
}
