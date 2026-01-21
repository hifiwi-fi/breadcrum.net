---
title: '🗄️ Archives'
layout: 'docs'
---

Archives are readability snapshots of a bookmark and capture the relevant textual content from a URL. They store extracted HTML or text so you can read the page later, even if the source changes. They are lightweight and quick to generate. You can add multiple archives to a bookmark, which is useful for capturing any changes that may happen to a page over time.

See the [🗄️ Archives page](/archives/) to browse and open saved archives.

Use [🔎 archive search](/search/archives/) when you want to query saved archives by keyword.

## Lifecycle

Archives are created from bookmarks. When an archive is requested, Breadcrum creates an archive record and queues a background job to fetch the page, run readability extraction, and store the result. Extraction uses [@mozilla/readability](https://github.com/mozilla/readability) and sanitizes HTML with [dompurify](https://github.com/cure53/DOMPurify) before saving. While this runs, the archive is not ready. When the job finishes, the archive is marked ready and the content is attached. If extraction fails, the archive stores an error message instead.

Archive URLs on a bookmark are external links ([archive.today](https://archive.today/), [web.archive.org](https://web.archive.org/), etc). See [Archive links](/docs/bookmarks/archive-links/) for how those are stored on bookmarks. Archive resources are the stored readability snapshots inside Breadcrum.

## Create an archive

1. Create or edit a bookmark.
2. Check "create new archive".
3. Save the bookmark. The archive will appear on the bookmark and under [/archives](/archives/) once ready.

## Edit an archive

Editing is intentionally limited. The archive edit form only allows renaming the title, and full archive views are read-only.

## Delete an archive

Use the archive edit form to delete an archive. Deleting an archive does not delete its parent bookmark.
