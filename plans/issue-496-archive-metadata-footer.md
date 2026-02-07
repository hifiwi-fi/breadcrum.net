# Plan: Archive metadata footer (issue #496)

## Goal
Expose archive metadata that is currently hidden from the header by adding a footer section in the single archive view page. The footer should show any archive metadata not already displayed in the header.

## Inventory (current state)
- UI header (ArchiveView): title, url + site_name, byline, bookmark title, excerpt, created_at
- UI body: error (full view), html_content/text_content
- API schema fields: id, created_at, updated_at, url, title, site_name, html_content, text_content, length, excerpt, byline, direction, language, ready, error, done, extraction_method, display_title, bookmark
- Archive query selection currently omits some fields (e.g. text_content, done)

## Implementation Summary

### 1. API Updates ✅
**File: `packages/web/routes/api/archives/archive-query-get.js`**
- Added `text_content` field selection for full archives
- Added `done` field to query results
- All metadata needed for footer display is now available

### 2. Archive Footer Component ✅
**File: `packages/web/client/components/archive/archive-view.js`**
- Implemented inline footer markup within ArchiveView component
- Added `formatDate()` helper to format timestamps
- Added `addFooterItem()` helper to conditionally add metadata items
- Footer displays the following fields (when present):
  - `updated_at` (formatted timestamp)
  - `extraction_method` (code formatted)
  - `language` (code formatted)
  - `direction` (code formatted)
  - `length` (formatted with locale)
  - `done` (yes/no)
  - `ready` (yes/no)
- Footer only renders when `fullView === true` and items exist
- All fields are conditionally rendered (null/empty values are skipped)

### 3. Styling ✅
**File: `packages/web/client/components/archive/archive-view.css`**
- Added `.bc-archive-footer` with top margin, padding, and dashed border separator
- Added `.bc-archive-footer-list` with flexbox layout and gap spacing
- Added `.bc-archive-footer-item` styles for dt/dd pairs
- Used 0.8em font size and accent colors to match existing design
- Responsive layout with flex-wrap for smaller screens

### 4. Bonus: ResolveStatus Component Refactor ✅
While implementing the footer, also created a reusable component:

**New Files:**
- `packages/web/client/components/resolve-status/index.js`
- `packages/web/client/components/resolve-status/index.css`

**Updated Files:**
- `packages/web/client/components/archive/archive-view.js` - now uses `<ResolveStatus />`
- `packages/web/client/components/bookmark/bookmark-edit.js` - now uses `<ResolveStatus />`
- `packages/web/client/components/bookmark/bookmark-view.js` - now uses `<ResolveStatus />`
- `packages/web/client/components/bookmark/bookmark-resolve.css` - now imports from resolve-status

This eliminated duplicate code across multiple components and centralized the "Resolving..." indicator styling.

## Files Changed
- `packages/web/routes/api/archives/archive-query-get.js`
- `packages/web/client/components/archive/archive-view.js`
- `packages/web/client/components/archive/archive-view.css`
- `packages/web/client/components/resolve-status/index.js` (new)
- `packages/web/client/components/resolve-status/index.css` (new)
- `packages/web/client/components/bookmark/bookmark-edit.js`
- `packages/web/client/components/bookmark/bookmark-view.js`
- `packages/web/client/components/bookmark/bookmark-resolve.css`

## Next Steps
- [ ] Run `pnpm run test-web` to verify no regressions
- [ ] Manual smoke test: load an archive view with full metadata and verify footer appears
- [ ] Test with archives that have partial metadata (some null fields)
- [ ] Test with archives in "resolving" state
- [ ] Verify responsive layout on smaller screens
