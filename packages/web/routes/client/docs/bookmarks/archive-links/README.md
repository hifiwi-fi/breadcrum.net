---
title: '🫙 Archive links'
layout: 'docs'
---

Archive links are external, public snapshots you attach to a bookmark. They are separate from Breadcrum’s internal readability archives.

See [🔖 Bookmarks](/bookmarks/) to view and open archive links.

## How it works

You can store any public archive URLs ([archive.today](https://archive.today/), [web.archive.org](https://web.archive.org/), [ghostarchive.org](https://ghostarchive.org/), [threadreaderapp.com](https://threadreaderapp.com/), etc.). These links live on the bookmark and are displayed alongside it for quick access.

## Templates

- [archive.today](https://archive.today/): `https://archive.today/?run=1&url=...`
- [ghostarchive.org](https://ghostarchive.org/): `https://ghostarchive.org/search?term=...`
- [web.archive.org](https://web.archive.org/): `https://web.archive.org/...`
- [threadreaderapp.com](https://threadreaderapp.com/): `https://threadreaderapp.com/search?q=...`

To add more templates, see the source list in [`bookmark-edit.js`](https://github.com/hifiwi-fi/breadcrum.net/blob/master/packages/web/client/components/bookmark/bookmark-edit.js).

## Add archive links

1. Create or edit a bookmark.
2. Expand "archive URLs".
4. Click on any of the archive template links to identify the archive URL in a new tab.
5. Paste one or more public archive URLs.
6. Save the bookmark.

## View archive links

Archive links appear on the bookmark card and in the bookmark detail view. They are not searchable content; they are quick links.

## Remove archive links

Open Edit, delete the URL(s), and save.
