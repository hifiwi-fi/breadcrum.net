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

### Use @ts-expect-error over @ts-ignore

Always use `@ts-expect-error` instead of `@ts-ignore` for TypeScript error suppression:

```javascript
// ✅ Good - will fail if error is fixed, alerting us to remove the comment
// @ts-expect-error - No type definitions available for @breadcrum/bookmarklet
import getBookmarklet from '@breadcrum/bookmarklet'

// ❌ Avoid - continues to suppress even when unnecessary
// @ts-ignore - No type definitions available for @breadcrum/bookmarklet
import getBookmarklet from '@breadcrum/bookmarklet'
```

This ensures error suppressions are removed when they become obsolete.

### Use newer @import syntax in jsdoc/ts-in-js for types only

The @import syntax is for TYPE IMPORTS ONLY. Regular imports (functions, classes, values) still use standard ES module import syntax.

Avoid inline type imports and prefer the newer @import syntax placed near the top level imports.

Instead of this:

```javascript
/** @import {QueryResult} from 'pg' */
/** @type {QueryResult<TypeUserRead>} */
const results = await client.query(query)
```

Do this

```javascript
/** @import {QueryResult} from 'pg' */

// Other imports/code...

/** @type {QueryResult<TypeUserRead>} */
const results = await client.query(query)
```

Note: Only use @import for types. Regular imports use standard syntax:

```javascript
/** @import {QueryResult} from 'pg' */  // Type import
import { Pool } from 'pg'  // Regular import for the actual Pool class
```

### Import Consolidation

**Consolidate type imports from the same module** - combine multiple type imports from the same module into a single @import statement:

```javascript
// ❌ Avoid separate type imports from same module
/** @import { FunctionComponent } from 'preact' */
/** @import { ComponentChild } from 'preact' */
/** @import { QueryResult } from 'pg' */
/** @import { Pool } from 'pg' */

// ✅ Consolidate type imports from same module
/** @import { FunctionComponent, ComponentChild } from 'preact' */
/** @import { QueryResult, Pool } from 'pg' */
```

Remember: @import is for types only. Regular imports still use standard ES module syntax and should be consolidated using standard import syntax:

```javascript
// ✅ Regular imports consolidated normally
import { render, hydrate } from 'preact'
import { Pool, Client } from 'pg'
```

### Preact Component Type Import Syntax

For preact component types, always use the @import syntax at the top of the file:

```javascript
/**
 * @import { FunctionComponent, ComponentChild, JSX } from 'preact'
 */
```

Never use inline import syntax like `import('preact').ComponentChild` - always use the @import syntax for types:

```javascript
// ❌ Avoid inline type imports
legend?: string | import('preact').ComponentChild

// ✅ Use @import syntax for types
/** @import { ComponentChild } from 'preact' */
legend?: string | ComponentChild
```

For actual preact functions/components, use regular imports:

```javascript
/** @import { FunctionComponent } from 'preact' */  // Type import
import { render } from 'preact'  // Regular import
import { html } from 'htm/preact'  // Regular import
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

### API Route Typing Patterns

When working with Fastify routes, use proper schema validation and type extraction:

#### Schema-Based Route Definitions

Always import and use predefined schemas instead of inline definitions:

```javascript
// ✅ Good - use imported schemas
import { schemaUserRead } from './schemas/schema-user-read.js'

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *   }
 * }>}
 */
export async function getUser (fastify, _opts) {
  fastify.get('/', {
    schema: {
      response: {
        200: schemaUserRead
      }
    }
  }, async function getUserHandler (request, reply) {
    // handler implementation
  })
}
```

#### Date Deserialization

Use the `SerializerSchemaOptions.deserialize` option to automatically convert date-time strings to Date objects on the server side:

```javascript
/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
```

This ensures that date-time fields in responses are properly typed as `Date | null` objects for nullable fields, or `Date` for non-nullable fields. Use `Date | null` in the output type to handle nullable date fields properly.

#### Response Type Extraction

Extract response types using `ExtractResponseType` with the specific status code:

```javascript
/**
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */

async function handler (request, reply) {
  /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */

  /** @type {ReturnBody} */
  const returnBody = {
    // properly typed response data
  }

  return reply.code(200).send(returnBody)
}
```

#### Return Value Pattern

Always use `reply.code().send()` for explicit status codes and proper type narrowing:

```javascript
// ✅ Good - explicit status code with send
return reply.code(201).send({
  token,
  auth_token: authToken,
})

// ❌ Avoid - implicit return without status code
return {
  token,
  auth_token: authToken,
}
```

This pattern ensures:
- Explicit HTTP status codes
- Proper type extraction with `ExtractResponseType`
- Type safety for response bodies
- Consistent error handling

#### Nullable Fields in Schemas

For nullable fields in JSON schemas, use the `nullable: true` property instead of type arrays:

```javascript
// ✅ Good - use nullable property
{
  type: 'string',
  nullable: true,
  format: 'date-time',
  description: 'Optional date field'
}

// ❌ Avoid - type arrays for nullable
{
  type: ['string', 'null'],
  format: 'date-time',
  description: 'Optional date field'
}
```

This ensures proper JSON Schema validation and TypeScript type generation.

#### Required Nullable Fields vs Optional Fields

Prefer required nullable fields over optional fields in schemas for consistency and clarity:

```javascript
// ✅ Good - required nullable field
{
  type: 'object',
  required: ['id', 'name', 'updated_at'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    updated_at: {
      type: 'string',
      nullable: true,
      format: 'date-time'
    }
  }
}

// ❌ Avoid - optional field
{
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    updated_at: {
      type: 'string',
      format: 'date-time'
    }
  }
}
```

This pattern ensures:
- Consistent handling of null vs undefined
- Better alignment with database query results
- Clearer API contracts

#### Schema Type Exports

Where you define schemas, always export a `FromSchema` type without deserialization options for use in other parts of the application:

```javascript
/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaUserRead} SchemaUserRead
 * @typedef {FromSchema<SchemaUserRead>} TypeUserRead
 */

export const schemaUserRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  // ... schema definition
})
```

This provides a base type that can be imported and used throughout the application without route-specific deserialization transformations.

#### Database Query Types

Define query result types next to your queries, separate from schemas, to ensure query types align with schema types:

```javascript
/**
 * @typedef {Object} UserRow
 * @property {string} id - User UUID
 * @property {string} name - User name
 * @property {Date|null} updated_at - Last update time
 * @property {string} email - User email
 */

const getUserQuery = SQL`
  SELECT id, name, updated_at, email
  FROM users
  WHERE id = ${userId}
`

/** @type {QueryResult<UserRow>} */
const result = await fastify.pg.query(getUserQuery)
```

This pattern ensures:
- Query types are maintained alongside query definitions
- Easy verification that database types match schema expectations
- Clear documentation of what the database returns

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

- **Component end-tags**: `<${Footer}>footer content<//>` or `<${Footer}>footer content<//>`

  **Note**: Use `<//>` as the preferred closing tag syntax for HTM components. While `<//` works, `<//>` is more consistent with JSX conventions.

- **Multiple root elements** (fragments): `<div /><div />`

- **HTML-style comments**: `<div><!-- comment --></div>`

- **Standard JSX event handlers**: `<button onClick=${handleClick}>Click me</button>`

### Handling String Content in Layouts

When working with string HTML content in layouts, there are two main approaches depending on the context:

#### For Single Element Containers
Use `dangerouslySetInnerHTML` when rendering into a single element:

```js
${typeof children === 'string'
  ? html`<section class="content" dangerouslySetInnerHTML="${{ __html: children }}" />`
  : html`<section class="content">${children}</section>`
}
```

#### For Multi-Child Fragments or String Concatenation
When you need to mix string content with other components in a fragment, use `preact-render-to-string` for string concatenation:

```js
import { render } from 'preact-render-to-string'

// Render components to strings and concatenate
const headerContent = html`
  <h1>${args.vars.title}</h1>
  <nav>Navigation here</nav>
`

const wrappedChildren = typeof children === 'string'
  ? render(headerContent) + children  // String concatenation
  : html`
      ${headerContent}
      ${children}
    `
```

This technique is necessary because the `html` tagged template function expects proper template syntax, not arbitrary string interpolation. String rendering and concatenation is the correct approach when you need to combine rendered components with string HTML content.

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

## Component Naming Convention

**FunctionComponents should use capitalized function names** (class name style):
```js
// ✅ Good - capitalized component names
export const ArticleHeader = ({ title, publishDate }) => { ... }
export const Breadcrumb = ({ pathSegments }) => { ... }

// ❌ Avoid - lowercase function names
export const articleHeader = ({ title, publishDate }) => { ... }
export const breadcrumb = ({ pathSegments }) => { ... }
```

This follows React/Preact conventions and makes it clear these are components, not regular functions.

### Component Syntax

**🚨 CRITICAL: NEVER call Preact function components directly** - they break component identity and reconciliation:
```js
// ❌ DANGEROUS - breaks React/Preact reconciliation and hooks
${MyComponent({ prop: value })}

// ❌ DANGEROUS - direct function calls break everything
MyComponent()

// ❌ DANGEROUS - even in tests and page wrappers
export default () => {
  return Page()  // This breaks hooks!
}
```

**⚠️ This applies EVERYWHERE**: Tests, page wrappers, component composition - components must ALWAYS be called through HTM syntax, never as direct function calls.

**✅ Use HTM component syntax** for proper component mounting:
```js
// ✅ Correct - proper component identity
<${MyComponent} prop=${value} />
```

**✅ For type safety, use a typed component helper**:
```js
/**
 * Typed component helper for better type checking with HTM
 * @template T
 * @param {FunctionComponent<T>} component
 * @param {T} props
 */
export const tc = (component, props) =>
  html`<${component} ...${props} />`

// Usage with full type checking:
${tc(MyComponent, { prop: value, onSave: handler })}
```

**When to use each approach:**
- **HTM component syntax**: Use for simple props (better performance)
  ```js
  <${Header} />
  <${Breadcrumb} pathSegments=${pathSegments} />
  ```
- **tc**: Use for complex props (better type checking)
  ```js
  ${tc(ArticleHeader, {
    title: vars.title,
    authorImgUrl: null,
    authorImgAlt: null,
    publishDate: vars.publishDate,
    updatedDate: vars.updatedDate
  })}
  ```

**Why direct function calls are dangerous:**
- Break component identity (React/Preact can't track components properly)
- Prevent proper reconciliation and diffing
- Can cause hooks to reset unexpectedly
- Break React DevTools component tree
- Prevent optimizations like memoization

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

## External package availability

If we need to work on an external package, you can likely find it in the ~/Developer directory. Packages by HifWifi, bomnes or bret are also available on GitHub.
