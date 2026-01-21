---
layout: article
title: "🥳 2025 Retrospective"
serif: false
publishDate: "2026-01-22T21:59:28.725Z"
authorName: "Bret Comnes"
authorUrl: "https://bret.io"
authorImgUrl: "/static/bret-ava.png"
description: "A look at what happened with Breadcrum in 2025."
image: "./img/FIX-ME.png"
---

Breadcrum is entering 2026, its 4th year! I know I said 4th year last year, but the I decided to start the clock on operation rather than inception.
Let's take a quick look at how 2025 went, what shipped, and where things are headed.

## By the Numbers

<figure>
  <a href="https://github.com/hifiwi-fi/breadcrum.net/graphs/contributors"><img src="./img/FIX-ME.png" alt="Breadcrum 2025 contribution graph"></a>
  <figcaption>TODO: Add a short note about the cadence this year.</figcaption>
</figure>

|           | 2022 | 2023 | 2024  | 2025   |
|-----------|------|------|-------|--------|
| Users     | 8    | 31   | 100   | 201    |
| Bookmarks | 2,070| 6,303| 10,244| 18,245 |
| Tags      | 235  | 597  | 1,091 | 1,697  |
| Episodes  | 1,175| 3,579| 5,883 | 11,495 |
| Archives  | 0    | 1,575| 3,573 | 5,375  |

## 2025 Highlights

- PWA Share Target support for fast saves from other apps.
- Cmd/Ctrl+Enter form submit shortcut across the app.
- Page transitions for smoother navigation.
- Syndication links and better docs breadcrumbs.
- Standard legal documents (privacy/terms/etc).
- Admin tooling improvements: cache flush panel, richer user admin views, pagination, and user agent tracking.
- Auth token management (endpoints + UI work-in-progress).
- Episode and archive resolution status.
- Nightly full database backups and database scaling.
- Work queue migration to pg-boss (removed bullMQ).
- Observability upgrades: OpenTelemetry metrics and dashboard work.
- Preact rewrite with client-side TypeScript checks enabled.
- Content and UX fixes across episodes, search, bookmarks, and archives.
- Episode extraction stability work in `yt-dlp-api`: tracked youtubei.js churn, Redis-backed session caching, and a dedicated onesie worker pool.
- `extract-meta` refresh: moved to Node LTS focus and updated jsdom/types tooling.
- Bookmarklet updates: removed sourcemaps and bumped `@breadcrum/extract-meta`.
- Tooling shifts: Node upgrades and switch to pnpm.
- Passkey support.
- Expanded docs
- CF Turnstyle
- Admin user mangement tools (for dealing with spam)
- Improved registration validation feedback
- Improved on-site bookmark add UI

## Community and Sustainability

TODO: Add notes about community spaces, donations, and any notable user stories.

## What Didn't Happen (Yet)

TODO: List planned items that slipped, and why.

## 2026 Focus Areas

- TODO: Data ownership and import/export.
- TODO: Reliability and data guarantees.
- TODO: Prioritized feature work based on user feedback.

## Thanks and Happy 2026!

<figure>
  <img src="./img/FIX-ME.png" alt="A 2025 view from Breadcrum HQ">
  <figcaption>TODO: Add a short caption about this photo.</figcaption>
</figure>

Thank you for being part of Breadcrum's journey. If you have feedback or feature ideas, I'd love to hear them.

## Syndication

- TODO: Mastodon
- TODO: X
- TODO: Bsky
