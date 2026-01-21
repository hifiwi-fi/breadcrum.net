---
title: '🔖 Bookmarks'
layout: 'docs'
---

Bookmarks are the core resource in Breadcrum. Each bookmark stores a URL, metadata, notes, tags, and links to any archives or episodes created from it.

See the [🔖 Bookmarks page](/bookmarks/) to browse and manage your list.

Use [🔎 bookmark search](/search/bookmarks/) when you want to query your collection by keyword.

## Lifecycle

When you create a bookmark, Breadcrum normalizes the URL to avoid duplicates. If a bookmark already exists for that URL, you are routed to edit it instead of creating a new one. Bookmarks are created as soon as the bookmarklet opens and you can close, edit or save it at any point.

New bookmarks resolve in the background. Breadcrum fetches page metadata (title, summary, tags) and can also create archives or episodes. While this happens, the bookmark shows a resolving state. Once resolved, the bookmark is marked done and any archives or episodes become ready.

<figure class="bc-resolve-example">
  <span class="bc-bookmark-resolve-status">
    <span aria-hidden="true">⏱</span>
    <span>Resolving</span>
    <span class="bc-resolve-dots" aria-hidden="true"></span>
  </span>
  <figcaption>When a bookmark is resolving, you will see a status indicator like this</figcaption>
</figure>

The bookmarklet always sends client-extracted metadata (title, summary, tags) and opens the add page with those fields prefilled. Tags default to what the page metadata suggests and can be edited. Tag suggestions come from keyword matches in the page title/summary/meta keywords and from URL patterns (for example: GitHub repos, tweets, YouTube videos, news articles, blog posts). If you want to tweak this behavior, see [bc-bookmarklet](https://github.com/hifiwi-fi/bc-bookmarklet) and [extract-meta](https://github.com/hifiwi-fi/extract-meta). Server resolution still runs after save to fill in any missing metadata.

## Create a bookmark

1. Use the [bookmarklet](/docs/bookmarks/bookmarklets/) or go to [/bookmarks/add](/bookmarks/add).
2. The bookmarklet pre-fills title, summary, and tags from the page. Tags default to metadata and URL hints. Existing URLs open in edit mode.
3. Fill in the URL, title, note, summary, and tags.
3. Optional actions:
   - Toggle to read, starred, or sensitive.
   - Add public archive URLs.
   - Check "create new archive" to capture a readability snapshot.
   - Check "create new episode" and choose a medium to turn media into a podcast episode.
4. Submit to save. Bookmarklet saves close the popup automatically.

## Edit a bookmark

From [/bookmarks](/bookmarks/) or a bookmark detail page, click Edit. You can update all fields, toggle flags, adjust tags, add archive URLs, or trigger a new archive/episode from an existing bookmark.

See the [🔖 Bookmarks page](/bookmarks/) to browse and manage your list.

## Delete a bookmark

Open Edit, click Delete, then confirm with Destroy. Deleting a bookmark removes it and its associated data from your account.

## Related bookmark docs

- [📑 Bookmarklets](./bookmarklets/)
- [🍎 Apple Shortcuts](./apple-shortcuts/)
- [🔗 Bookmark Add Page API](./bookmark-add-page-api/)
- [⭐️ Starred](./starred/)
- [🔵 Read it later](./toread/)
- [🤫 Private (Sensitive)](./private/)
- [🫙 Archive links](./archive-links/)
