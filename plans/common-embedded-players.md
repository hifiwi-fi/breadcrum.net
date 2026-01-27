# Common embedded players plan

## Status snapshot (verified from code on 2026-02-07)
- This plan is updated to match the current implementation in `packages/resources`, `packages/worker`, and `packages/web`.
- Major delivered areas: DB/API support, worker resolve/sanitize/persist flow, API-side template hydration, frontend embed rendering with fallback, and episode detail metadata footer.
- Still open: backfill, oEmbed tests, oEmbed-specific metrics, iframe host allowlisting.

## Context (code reads)
- Episodes and feeds pages render media via `CorsMedia` in `packages/web/client/components/episode/episode-view.js`.
- Episode API responses come from `packages/web/routes/api/episodes/episode-query-get.js` and `packages/web/routes/api/episodes/schemas/episode-base.js`.
- Episode metadata is populated in the worker at `packages/worker/workers/episodes/finaize-episode.js` using yt-dlp metadata.
- Worker-side embed resolving/sanitization lives in `packages/worker/workers/episodes/resolve-embed.js` and `packages/resources/episodes/oembed.js`.

## Goals
- For common media sources, show official embedded players on feeds/episodes pages.
- API-driven: embed data is resolved server-side (worker/API), not discovered in the browser.
- Preserve existing media preview fallback via `CorsMedia`.

## Non-goals (for now)
- Full oEmbed-provider coverage.
- Major feed/episode layout redesign.
- Executing arbitrary third-party scripts. Current script loading is only for explicitly supported providers.

## Architecture

Two categories of providers are used:

### Template providers (generated at API response time)
- Providers: YouTube, Vimeo, Dailymotion.
- Nothing is stored specifically for template provider HTML. `hydrateEmbed()` calls `generateTemplateEmbed(episode.url)` and overwrites `episode.oembed` if a template match is found.
- Template changes apply immediately to all matching episodes without DB backfill.
- YouTube uses `youtube-nocookie.com` and `referrerpolicy="origin"`.

### Fetched providers (resolved in worker and persisted in DB)
- Providers: SoundCloud, Spotify, Twitter/X, Rumble, Bluesky.
- Worker resolves from provider oEmbed endpoints, sanitizes HTML, and stores payload in `episodes.oembed`.
- API hydration passes stored embed through when no template provider matches.

## Implementation status

### 1) Store oEmbed data + published_time on episodes - DONE
- Migration `packages/web/migrations/029.do.add-episode-oembed.sql` adds nullable `oembed` JSONB and nullable `published_time` timestamptz on `episodes`.
- Episode API schema (`packages/web/routes/api/episodes/schemas/episode-base.js`) exposes:
  - `oembed` fields: `type`, `provider_name`, `provider_url`, `html`, `width`, `height`, `thumbnail_url`, `title`.
  - `published_time` as nullable date-time.
- Query projection (`packages/web/routes/api/episodes/episode-query-get.js`) selects `ep.oembed` and `ep.published_time`.

### 2) Resolve embeds in worker - DONE
- Shared resolver: `packages/resources/episodes/oembed.js`.
- `resolveEmbed()` provider list includes SoundCloud, Spotify, Twitter/X, Rumble, Bluesky.
- Worker resolver (`packages/worker/workers/episodes/resolve-embed.js`) calls `resolveEmbed()` with `fastify.cache` and `oembedCacheTtl` (24h).
- `resolveEmbed()` now unwraps cache return shapes (`{ item }`, `{ value }`, or raw) so `fastify.cache` can be passed directly.
- Sanitization:
  - Default path: DOMPurify allowlist with iframe-related attributes.
  - Twitter path: validate `script src === https://platform.twitter.com/widgets.js`, require `<blockquote class="twitter-tweet">`, remove scripts.
  - Bluesky path: validate `script src === https://embed.bsky.app/static/embed.js`, require `<blockquote class="bluesky-embed">`, remove scripts.
- Called by both workers:
  - `packages/worker/workers/episodes/index.js`
  - `packages/worker/workers/bookmarks/index.js`
- Persisted by `finalizeEpisode()` in `packages/worker/workers/episodes/finaize-episode.js`:
  - `oembed` payload
  - `published_time` from `release_timestamp` when present
- Failures degrade gracefully to `oembed = null` with warning logs.

### 3) Frontend embed rendering + fallback - DONE
- `packages/web/client/components/episode/episode-view.js`:
  - Uses `oembed.html` when present.
  - Keeps `CorsMedia` fallback when no embed or when user toggles to preview media.
  - Adds click-to-load gate: embed HTML is not injected until user clicks "Click to load <provider>".
  - Shows "Preview original media" / "Show embed" toggle when embed and media are both available.
  - Dynamically loads provider scripts when needed:
    - Twitter: `platform.twitter.com/widgets.js`, then `twttr.widgets.load()`
    - Bluesky: `embed.bsky.app/static/embed.js`, then `window.bluesky.scan()`
- `packages/web/client/components/episode/episode-view.css`:
  - Responsive iframe sizing via `--bc-embed-aspect`.
  - SoundCloud-specific fixed-height override.
  - Footer styles for metadata section.

### 4) CSP / Helmet support - DONE (with current config)
- `packages/web/plugins/helmet.js` currently allows relevant frame/script origins including:
  - YouTube (`youtube.com`, `youtube-nocookie.com`)
  - Vimeo
  - SoundCloud
  - Spotify
  - Dailymotion (`geo.dailymotion.com`)
  - Rumble
  - Twitter
  - Bluesky
- `crossOriginEmbedderPolicy` remains controlled by `SECURE_IFRAMES`.
- Current `connect-src` does not include `syndication.twitter.com`.

### 5) Episode metadata footer (detail page only) - DONE
- `EpisodeView` supports optional `fullView` prop and conditionally renders footer rows.
- `EpisodeList` threads `fullView` through.
- Detail page passes `fullView: true` from `packages/web/client/episodes/view/client.js`.
- Footer rows (conditionally rendered):
  - Media: MIME, size, medium
  - Author: name/link
  - Embed: provider/type
  - Status: ready, published, created, updated

### 6) Feed title fix on single episode route - DONE
- `packages/web/routes/api/episodes/_episode_id/get-episode.js` applies `getFeedWithDefaults()` before returning episode, aligning single-episode behavior with list behavior.

### 7) Backfill existing episodes - TODO
- Template providers need no backfill.
- Fetched providers still need backfill for pre-existing episodes:
  - SoundCloud, Spotify, Twitter/X, Rumble, Bluesky.

### 8) Testing + observability - TODO
- No focused unit tests yet for oEmbed provider matching, template extractors, or sanitizer behavior.
- No oEmbed-specific success/failure counters yet.
- Existing episode metrics in `packages/worker/plugins/otel-metrics.js` are still generic job-level counters/histograms.

## Known drift / cleanup follow-ups
- Some inline comments in code still mention older provider sets (for example "YouTube/Vimeo" or only three fetched providers), while implementation now includes Dailymotion, Rumble, and Bluesky.
- `packages/worker/workers/bookmarks/index.js` still has a debug `console.dir({ oembed })` line in the episode creation path.

## Remaining work / future improvements
- Add provider test coverage:
  - `extractYouTubeVideoId`, `extractVimeoVideoId`, `extractDailymotionVideoId`
  - `generateTemplateEmbed`
  - `resolveEmbed` provider matching/cache behavior
  - `sanitizeTwitterHtml` and `sanitizeBlueskyHtml`
- Add oEmbed-specific OTel counters (success/failure, possibly provider-tagged).
- Implement fetched-provider backfill.
- Consider second-layer iframe `src` host allowlisting after sanitization.
- Expand provider coverage further (Apple Podcasts, Bandcamp, etc.).

## Resolved questions
- Embed + media preview are both retained; users can switch views.
- Template providers are generated at API response time (currently YouTube, Vimeo, Dailymotion).
- Fetched providers are persisted from worker resolution (currently SoundCloud, Spotify, Twitter/X, Rumble, Bluesky).
- Twitter and Bluesky are handled via validated script-stripping server-side plus controlled client-side script loading.
- `published_time` is persisted from yt-dlp `release_timestamp` and shown in detail footer.

## Open questions
- Which additional providers should be prioritized next?
- Should iframe `src` host allowlisting be added as a second sanitization layer?
- Should click-to-load remain the default behavior for all embed providers, or be provider-specific?

## Milestones
- M1: DB + API support for `oembed` and `published_time`. - DONE
- M2: Worker fetch/sanitize/persist + caching for fetched providers. - DONE
- M3: Frontend embed rendering with fallback + click-to-load activation. - DONE
- M4: Episode metadata footer + single-episode feed defaults fix. - DONE
- M5: Backfill existing fetched-provider episodes. - TODO
- M6: Unit tests for oEmbed/template/sanitizer logic. - TODO
- M7: oEmbed-specific observability metrics. - TODO
