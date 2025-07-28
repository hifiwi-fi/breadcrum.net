# Agent Development Notes

This is a TypeScript-in-JavaScript type checked codebase. All code uses JSDoc comments for type annotations and is type-checked by TypeScript without requiring .ts files.

## JSDoc Typing Patterns

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

- Breadcrum uses posgres
- Use `FETCH FIRST n ROWS ONLY` over `LIMIT`

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
