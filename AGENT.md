# Agent Development Notes

This is a TypeScript-in-JavaScript type checked codebase. All code uses JSDoc comments for type annotations and is type-checked by TypeScript without requiring .ts files.

## JSDoc Typing Patterns

### Avoid any types

Never use `any` types - always use specific types that describe the actual data structure. Instead of:

```javascript
// ❌ Avoid
const data: any = {...}

// ❌ Avoid
function process(item: any) {...}
```

Use specific types:

```javascript
// ✅ Good
const data: { id: number, name: string } = {...}

// ✅ Good
function process(item: { id: number, name: string }) {...}
```

### Use newer @import syntax in jsdoc/ts-in-js

Avoid inline imports as much as possible and prefer the newer @import syntax placed near the top level imports.

Instead of this:

```javascript
/** @type {import('pg').QueryResult<TypeUserRead>} */
const results = await client.query(query)
```

Do this

```javascript
/** @import {QueryResult} from 'pg' */

// Other imports/code...

/** @type {QueryResult<TypeUserRead>} */
const results = await client.query(query)
```

### Import Consolidation

**Consolidate imports from the same module** - combine multiple imports from the same module into a single @import statement:

```javascript
// ❌ Avoid separate imports from same module
/** @import { FunctionComponent } from 'preact' */
/** @import { ComponentChild } from 'preact' */
/** @import { QueryResult } from 'pg' */
/** @import { Pool } from 'pg' */

// ✅ Consolidate imports from same module
/** @import { FunctionComponent, ComponentChild } from 'preact' */
/** @import { QueryResult, Pool } from 'pg' */
```

### Preact Component Import Syntax

For preact components, always use the @import syntax at the top of the file:

```javascript
/**
 * @import { FunctionComponent, ComponentChild, JSX } from 'preact'
 */
```

Never use inline import syntax like `import('preact').ComponentChild` - always use the @import syntax instead:

```javascript
// ❌ Avoid inline imports
legend?: string | import('preact').ComponentChild

// ✅ Use @import syntax
/** @import { ComponentChild } from 'preact' */
legend?: string | ComponentChild
```

### Prefer Schema-Based Types

Always import types from schema files instead of redefining them manually:

```javascript
// ✅ Good - import from schema
/** @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js' */

archive: TypeArchiveReadClient

// ❌ Avoid - manual type definition
archive: {
  id: string,
  title: string,
  url: string,
  // ... many more fields
}
```

This ensures:
- Single source of truth for types
- Automatic updates when schemas change
- Consistency across components

### Form Element Access Pattern

When accessing form elements through refs, use proper type casting with null checks:

```javascript
const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
if (!form) return

const titleElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('title'))
if (!titleElement) return
const title = titleElement.value
```

### Error Handling in Components

Always type-cast errors and check for optional callbacks:

```javascript
try {
  if (onSave) await onSave(formState)
} catch (err) {
  setError(/** @type {Error} */(err))
}
```

### Typing Database Query Results

When working with PostgreSQL queries using `pg`, you can type the query results without casting by declaring the type on the variable:

```javascript
/** @import {QueryResult} from 'pg' */

/** @type {QueryResult<TypeUserRead>} */
const results = await client.query(query)
return results.rows[0] // Automatically typed as TypeUserRead | undefined
```

This pattern avoids the need for type casting and provides proper typing for:
- `results.rows` - typed as `TypeUserRead[]`
- `results.rows[0]` - typed as `TypeUserRead | undefined`
- Other QueryResult properties like `rowCount`, `fields`, etc.

This is preferable to casting the return value:
```javascript
// Avoid this pattern when possible
const results = await client.query(query)
return /** @type {TypeUserRead | undefined} */ (results.rows[0])
```

## SQL

- Breadcrum uses postgres
- Use `FETCH FIRST n ROWS ONLY` over `LIMIT`
- Use lowercase SQL keywords and identifiers (e.g., `alter table`, `drop column`, `create index`)
- SQL files should follow lowercase style consistently

## Testing

- Tests use Node.js built-in test runner, not Jest or other frameworks
- Run specific test files directly: `node --test path/to/test.js`
- Run multiple test files with glob: `node --test path/**/*.test.js`
- Tests are usually in the same directory as the code they test
- All tests are written with the Node.js test runner
- Cannot use `npm test -- --grep "pattern"` - that's for other test runners. Use `node --test --test-name-pattern="pattern"` to filter tests by name pattern
- Use the test script in package.json for workspace-specific testing
- **Always check editor diagnostics before running unit tests** - fix any TypeScript/JSDoc errors first to avoid test failures
- **Test resource cleanup**: Tests that create resources (users, tokens, etc.) should clean them up using appropriate test lifecycle hooks (`t.after()`)
- **Database cascade deletes**: Resources should be designed with proper foreign key constraints and cascade deletes to automatically clean up dependent resources
- **Auto-formatting**: Use `npm run test:eslint -- --fix` to automatically fix ESLint formatting errors
- **Documentation lookup**: Use context7 with discovered library IDs (e.g., `/nodejs/node`, `/bcomnes/domstack`) to skip the resolve step and look up docs directly
- Avoid branching or skipping tests. If something isn't right fail the tests.
- Avoid using colsole debugging in tests when an asserts can be used instead, unless you are solving a problem and just need console output short term.

## Client-Side Code

- Client-side code is written using @domstack/static in the `packages/web/client` folder
- All client-side code is directly runnable in Node.js and browsers via esbuild
- Client-side JavaScript bundles are built using @domstack/static's build system with esbuild
- Page-specific client code goes in `client.js` files alongside page files.
- Layout-specific client code goes in `.layout.client.js` files
- Global client code goes in `global.client.js`
- All client code supports ESM imports and can import from npm packages
- When working on client side code (anything that runs in the browser) in the `pacakges/web/client` folder, always ensure we set the following headers/pragma:

```js
/// <reference lib="dom" />
/* eslint-env browser */
```

## Preact/HTM Template Constraints

HTM is JSX-like syntax in plain JavaScript with no transpiler necessary. It uses standard JavaScript Tagged Templates.

### HTM Syntax Features

- **Single interpolation per attribute**: htm only supports one tagged template interpolation per HTML attribute
  ```javascript
  // ❌ Won't work - multiple interpolations
  class="${someClass} ${anotherClass}"

  // ✅ Works - single interpolation
  class="${`${someClass} ${anotherClass}`}"
  class="${someClass + ' ' + anotherClass}"
  ```

- **Use classnames for conditional classes**: Import and use `classnames` as `cn` for class attribute toggles
  ```javascript
  import cn from 'classnames'

  // Use cn for conditional classes
  class="${cn({
    'bc-item': true,
    'bc-item-active': isActive,
    'bc-item-disabled': isDisabled
  })}"
  ```

- **Spread props**: `<div ...${props}>` (note the three dots inside the interpolation)

- **Self-closing tags**: `<div />`

- **Components**: `<${Foo}>` where `Foo` is a component reference

- **Boolean attributes**: `<div draggable />` (no value needed)

- **HTML's optional quotes**: `<div class=foo>` (quotes optional for simple values)

- **Component end-tags**: `<${Footer}>footer content<//>`

- **Multiple root elements** (fragments): `<div /><div />`

- **HTML-style comments**: `<div><!-- comment --></div>`

- **Standard JSX event handlers**: `<button onClick=${handleClick}>Click me</button>`

### Converting String Children to HTM Templates

When working with string HTML content that needs to be rendered as JSX, convert it to a proper TemplateStringsArray-like object:

```js
// For string children in layouts
${typeof children === 'string'
  ? html(Object.assign([children], { raw: [children] }))
  : children
}
```

### HTM Template Guidelines

- **Single interpolation per attribute**: htm only supports one template interpolation per HTML attribute
  ```js
  // ❌ Wrong - multiple interpolations
  class="${someClass} ${anotherClass}"

  // ✅ Correct - single interpolation
  class="${`${someClass} ${anotherClass}`}"
  ```
- **Use classnames for class toggles**: Always import and use `classnames` as `cn` for conditional classes
  ```js
  import cn from 'classnames'
  ```
- **HTML comments**: Use HTML-style comments for TODO items or disabled functionality
  ```js
  <!-- TODO: Add Edit button when editing is supported -->
  ```

## Converting from uland-isomorphic to Preact

When converting uland-isomorphic components to preact:

### Component Definition
```js
// ❌ uland pattern
import { Component, html } from 'uland-isomorphic'
export const MyComponent = Component(() => {
  return html`<div>content</div>`
})

// ✅ preact pattern
import { html } from 'htm/preact'
export const MyComponent = () => {
  return html`<div>content</div>`
}
```

### Client-Side Rendering
```js
// ❌ uland pattern
import { render } from 'uland-isomorphic'
render(document.querySelector('.container'), component)

// ✅ preact pattern
import { render } from 'preact'
const container = document.querySelector('.container')
if (container) {
  render(component(), container)
}
```

### Isomorphic Page Wrapper
```js
// ❌ uland pattern
import { html } from 'uland-isomorphic'
import { page } from './client.js'

export default () => {
  return html`${page()}`
}

// ✅ preact pattern
import { page } from './client.js'

export default () => {
  return page()
}
```

## Component Conversion Checklist

When converting components from uland to preact:

1. **Update imports**: `uland-isomorphic` → `htm/preact` + `preact/hooks`
2. **Remove Component wrappers**: `Component(() => {...})` → `() => {...}`
3. **Add proper typing**: Use `@import` statements and specific types
4. **Fix string children**: Use `html(Object.assign([children], { raw: [children] }))`
5. **Add DOM headers**: For client-side code, include `/// <reference lib="dom" />` and `/* eslint-env browser */`
6. **Use schema types**: Import from schema files instead of redefining
7. **Check diagnostics**: Fix all TypeScript errors before considering complete
8. **Avoid any types**: Always use specific types that describe actual data
9. **Handle optional callbacks**: Check existence before calling: `if (onSave) await onSave(...)`
10. **Type-cast errors**: Use `/** @type {Error} */(err)` in catch blocks

## Package.json Scripts

Scripts use `npm-run-all2` (run-s for sequential, run-p for parallel). Scripts with `:` separator (e.g., `test:node`, `test:eslint`) are used in glob patterns like `run-s test:*`. Individual steps can also be run directly. This repo will follow this pattern strictly.

### Root Level Scripts
- `npm test` - Run tests in all workspaces
- `npm run test-web` - Run tests specifically in web workspace
- `npm run test-worker` - Run tests specifically in worker workspace
- `npm run watch` - Start development mode (both web and worker)
- `npm run build` - Build all workspaces
- `npm run migrate` - Run database migrations
- `npm run start` - Alias for watch
- `npm run deploy` - Deploy both web and worker to production
- `npm run neostandard` - Run linter across project
- `npm run knip` - Check for unused dependencies
- `npm run deps` - Generate dependency graph

### Web Workspace Scripts
- `npm run test` - Run eslint and node tests with coverage
- `npm run test:node` - Run node tests with c8 coverage
- `npm run test:eslint` - Run eslint
- `npm run watch` - Start development server with file watching
- `npm run build` - Build client assets with @domstack/static
- `npm run migrate` - Run database migrations with postgrator
- `npm run prod-sim` - Start production simulation
- `npm run print-routes` - Print all fastify routes
- `npm run print-plugins` - Print all fastify plugins

### Worker Workspace Scripts
- `npm run test` - Run eslint, node tests, and typescript check
- `npm run test:node` - Run node tests with c8 coverage
- `npm run test:eslint` - Run eslint
- `npm run test:tsc` - Run typescript check
- `npm run watch` - Start development worker with file watching
- `npm run prod-sim` - Start production simulation
- `npm run print-routes` - Print all fastify routes
- `npm run print-plugins` - Print all fastify plugins
