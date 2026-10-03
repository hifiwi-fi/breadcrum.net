---
title: 🔎 Introducing Full Text Search
publishDate: "2023-09-17T22:09:09.206Z"
layout: "article"
---

Breadcrum now has full text search!

When you save a bookmark, episode and archive, Breadcrum now maintains a Postgres full text search index on your notes, summary and article content inside archives. Episode notes are also indexed. (🤔 Now that I'm writing this, can we index subtitles as well?)

## How it works

Simply enter your query in the search bar at the top of the page, and then select if you want to search bookmarks, archives or episodes. The search query will do its best to try and find your content.

![](./fts-screenshot.png)

## Feedback welcome

Please feel free to provide any feedback you have on this feature. It is new so there could always be bugs.
