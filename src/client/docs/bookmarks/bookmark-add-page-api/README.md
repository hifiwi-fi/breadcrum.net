---
title: '🔗 Bookmark Add Page API'
layout: 'docs'
---

The bookmarklet opens the [Bookmark Add](/bookmarks/add) page with query parameters populated by client-side metadata extraction. You can use the same parameters to prefill the add page or trigger resolution.

Example:

`/bookmarks/add/?url=https://example.com&title=Example%20Title`

Query parameters:

- `url`: (Required) A URL you want to bookmark or edit.
- `title`: The title to create a non-existing bookmark with.
- `note`: The note to create a non-existing bookmark with.
- `tags`: Tags to create a non-existing bookmark with. Append multiple `tags` parameters to apply more than one tag.
- `meta`: Set to `true` to request server-extracted metadata. Client-provided metadata overrides server-extracted metadata. This option is slightly slower to create a bookmark.
- `jump`: Set to `close` to close the window after successful submit.

A title is required if `meta` is set to `false`.

Related:

- [📑 Bookmarklets](/docs/bookmarks/bookmarklets/)
- [🍎 Apple Shortcuts](/docs/bookmarks/apple-shortcuts/)
