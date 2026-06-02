---
title: '📼 Episodes'
layout: 'docs'
---

Episodes capture media discovered in a bookmark URL. Each episode is linked to a bookmark and, when ready, appears in your private feed. Episodes can be video or audio content. Breadcrum attempts to discover episode media automatically, but given the nature of the modern web, this isn't always possible. If a page has media but resolution doesn't find it, you can create an episode manually with a custom media URL.

See [📡 Feeds docs](/docs/feeds/) to learn how to subscribe and manage your feed.

See the [📼 Episodes page](/episodes/) to browse and play episodes.

Use [🔎 episode search](/search/episodes/) when you want to query episodes by keyword.

## Lifecycle

Episodes are created from bookmarks. When an episode is requested, Breadcrum creates the episode record and queues a background job to resolve the media URL and metadata. While this runs, the episode is not ready. Once resolved, the episode stores duration, file info, and a playable link. If resolution fails, the episode records an error and may retry depending on the media source.

## Create an episode

1. Create or edit a bookmark.
2. Check "create new episode".
3. Choose video or audio, and optionally provide a custom media URL.
4. Save the bookmark. The episode will appear on the bookmark and under [/episodes](/episodes/) once ready.

## Edit an episode

Open an episode card and click Edit. You can rename the title or toggle the explicit flag.

## Delete an episode

Open Edit, click Delete, then confirm with Destroy. This removes the episode but keeps the bookmark.
