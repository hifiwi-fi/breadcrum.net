# Domstack Fastify Conversion Notes

## Local Link

`packages/web` currently uses:

```json
"@domstack/fastify": "file:../../../domstack-fastify"
```

This is intentional during the conversion.

## Upstream Before Switching Back To npm

- Release a `@domstack/fastify` version newer than `0.0.1` with:
  - page routes respecting `reply.sent` after direct `reply.send()` or `reply.redirect()` usage.
  - `load()` able to short-circuit rendering through `reply.sent`.
  - full-page layouts receiving the same `data` resolved by page `load()`.
  - full-page layout results normalized from `fragtml` renderables to strings before pretty-printing.
- After that release, replace the local file dependency with the published version.

## Native Fastify Routes Still Kept

These route families stay on `@fastify/autoload` for now:

- `routes/api/**`
- `routes/blog/**`
- `routes/docs/**`
- `routes/legal/**`

The content route families use wildcard/splat matching. The API routes remain native Fastify routes because they are JSON/resource routes rather than domstack HTML pages.

Generated text/feed routes remain native Fastify routes too, but are registered from `plugins/generated.js` so files like `/robots.txt` and `/feed.xml` stay mounted at the site root.

## Domstack Route Shape

The htmx HTML routes now use domstack entrypoints directly:

- `page.route.js` and `post.route.js` contain the former inline Fastify route handler logic directly.
- Newly refactored pages should use the domstack default render pipeline: page `load()` builds request data, the default page export renders the primary view, and method routes call `ctx.renderPage({ state })` for form redisplay.
- Root app chrome lives in `routes/root.layout.js`, which reads page `load()` data from the upstream layout context and handles htmx `main` fragments.
- Route-local helpers stay near the page/action files only when they are shared by that route subtree.
- The temporary capture bridge has been removed.
