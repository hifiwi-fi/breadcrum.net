# TanStack Query Integration Plan

## Goals
- Move bookmarks + episodes fetching to TanStack Query for caching and refetch control.
- Keep Preact + HTM + domstack build flow unchanged for pages that do not opt in.
- Avoid behavioral regressions in pagination, search params, and polling.

## Constraints and Observations
- Client bundles run via domstack + esbuild. domstack supports `esbuild.settings` overrides.
- `.jsx/.tsx` defaults to Preact; React-only libs need compat or build aliasing.
- There is already a `useQuery` hook for URL search params, which conflicts with TanStack’s `useQuery` name.
- domstack docs call out `esbuild.settings` as the hook to customize build options (including `target`, `jsx`, and `jsxImportSource`); unsetting `jsx`/`jsxImportSource` returns to default React transforms.
- Preact docs recommend aliasing `react`, `react-dom`, `react/jsx-runtime`, and `react-dom/test-utils` to the corresponding `preact/*` compat modules.
- TanStack Query React v5 docs require React 18+ and show `QueryClientProvider` as the required top-level provider.

## Decisions to Make
1. **Query package**
   - Option A (recommended): `@tanstack/react-query` + `preact/compat` aliasing.
   - Option B: `@tanstack/query-core` + custom Preact hook wrapper (more custom code).
2. **Provider location**
   - Each page mounts itself (no shared client root), so:
     - Wrap each `client.js` entry with `QueryClientProvider`, or
     - Create a shared `renderWithQueryClient` helper and use it from every page entry.
   - Root layout is only used during string rendering, so it cannot host the provider.
3. **Naming**
   - Keep existing `useQuery` and alias TanStack import (`useQuery as useTanstackQuery`), or rename the routing hook.

## Proposed Steps
1. **Build setup**
   - Add dependency on `@tanstack/react-query` (and `react`/`react-dom` if peer deps require it).
   - Update `packages/web/client/esbuild.settings.js` to alias:
     - `react` -> `preact/compat`
     - `react-dom` -> `preact/compat`
     - `react/jsx-runtime` -> `preact/jsx-runtime`
     - `react-dom/test-utils` -> `preact/test-utils` (optional)
   - Implement aliasing via esbuild settings (using an alias plugin or domstack-supported mechanism), keeping domstack’s Preact JSX defaults unless React JSX transform is required.
   - Confirm domstack’s esbuild override hook is applied to client bundles.

2. **QueryClient setup**
   - Add `packages/web/client/lib/query-client.js`:
     - Create a singleton `QueryClient` with default options (staleTime, retry, refetchOnWindowFocus).
   - Add a tiny `QueryProvider` wrapper component or helper render function used in each page entry, wrapping UI in `QueryClientProvider`.
   - Ensure `QueryClient` is shared across page mounts if multiple client bundles can coexist on a page (avoid duplicate caches).

3. **Bookmarks migration**
   - Replace `useBookmarks` local state with TanStack `useQuery`.
   - Query key should include:
     - `state.user?.id` (avoid cross-user cache)
     - URL search params (stringified in stable order)
     - `state.sensitive`, `state.toread`, `state.starred`
   - Use the query `signal` for fetch aborts.
   - Keep pagination metadata (`before`, `after`) in returned data (or `select`).
   - Preserve the “top page” behavior that removes `before/after` from URL.
   - Use `keepPreviousData` to avoid list flicker when paginating.

4. **Episodes migration**
   - Extract a `useEpisodes` hook (or update `episodes/client.js` inline) to use TanStack `useQuery`.
   - Include `bookmark_id` + `before/after` params in the query key.
   - Replace `useResolvePolling` usage with:
     - `refetchInterval` that returns `false` when no pending items, or
     - Keep `useResolvePolling` but call `refetch` instead of custom reload state.

5. **Follow-up upgrades (optional)**
   - Migrate other fetch hooks (admin users, archives, search) to `useQuery`.
   - Use `useMutation` for create/delete actions, then `invalidateQueries`.
   - Centralize query key helpers for consistency.

## Risks / Edge Cases
- **Name collisions** with `useQuery` (routing hook vs TanStack hook).
- **React 18 requirement** in TanStack Query v5: confirm `preact/compat` covers required hooks (or use query-core).
- **Cache leakage** if user identity is not part of the query key.
- **Pagination params**: ensure URL cleanup stays consistent with existing behavior.
- **Peer deps**: react-query may warn if `react`/`react-dom` aren’t installed even with aliasing.

## Verification Checklist
- Build client bundles: `pnpm -C packages/web run build:domstack`.
- Navigate bookmarks/episodes with pagination and filters; verify no flicker.
- Confirm polling still resolves pending items.
- Verify back/forward nav updates query data correctly.
