# Plan: Split Media Discovery from Media Extraction

## Problem

YouTube has become increasingly hostile to server-side media URL extraction:
- The `onesieFormatRequest` path in `yt-dlp-api` must: fetch raw metadata → decipher the URL → wait 3s → HEAD-validate the URL (with retries on 403)
- This slow, fragile process currently gates episode creation — the episode isn't `done=true` until it completes
- The media URL that's extracted during episode creation isn't even stored in the DB (`episodes.url` always stores the original YouTube URL, not the media URL)
- The podcast feed redirect (`GET /api/feeds/:feed/episode/:episode`) already re-fetches the media URL on demand via `getYTDLPMetadataWrapper` — so the extraction during episode creation is largely wasted work

## Key Insight

The system already separates "source URL" from "media URL":

- `episodes.url` = original source URL (e.g. `https://youtube.com/watch?v=...`)
- `episode.type = 'redirect'` = media URL is resolved on-demand by the podcast redirect endpoint
- `finalizeEpisode()` takes `url` (source URL) as a parameter and never writes `media.url` to the DB

The unified endpoint does too much work during episode creation. We only need
metadata (title, duration, thumbnail, channel, live_status, release_timestamp)
to mark an episode as ready. The media URL only matters when someone actually
plays the episode.

## Proposed Architecture

```
Episode Creation (fast, reliable):
  bookmark worker / episode worker
    → GET /discover   (new endpoint)
    → metadata only, no URL decipher, no HEAD check
    → finalizeEpisode() with metadata → done=true

Episode Playback (on demand):
  podcast feed redirect
    → GET /unified    (existing endpoint, unchanged)
    → full URL extraction + HEAD validation
    → 302 redirect to media URL
```

---

## Progress

### yt-dlp-api — DONE ✓

All yt-dlp-api changes are implemented and tested. Test results: 22/24 pass; the
2 failing tests (`GET /unified - X.com video extraction` and its discover
equivalent) are pre-existing flaky failures caused by X.com returning 500 from
yt-dlp — unrelated to this work.

### breadcrum.net — DONE ✓

All breadcrum.net changes are implemented and tests pass.

---

## Changes: `yt-dlp-api`

### YouTube Discovery: Use `innertube.getBasicInfo()` Instead of Onesie

The YouTube.js library exposes `innertube.getBasicInfo(videoId)` — a single
lightweight request to the player endpoint that returns all metadata fields we
need **without any URL decipher step at all**. This is far simpler than the
current Onesie protocol path, which requires TV client config, protobuf
encoding/decryption, and an encrypted tunnel.

`getBasicInfo` vs Onesie for metadata:

| | `getBasicInfo` | Onesie (current) |
|---|---|---|
| Requests | 1 (player endpoint) | 2 (redirector + initplayback) |
| Encryption | None | AES + HMAC + protobuf |
| TV client config | Not needed | Required |
| `googlevideo` lib | Not needed | Required |
| URL decipher | Never triggered | Must be skipped explicitly |
| Code complexity | Simple | Very high |

`basic_info` fields available without decipher:

| Field needed | `basic_info` source |
|---|---|
| `title` | `VideoDetails.title` |
| `duration` | `VideoDetails.duration` |
| `channel` | `PlayerMicroformat.channel.name` |
| `channel_url` | `PlayerMicroformat.channel.url` |
| `thumbnail` | `VideoDetails.thumbnail[0].url` |
| `description` | `basic_info.short_description` |
| `live_status` | `VideoDetails.is_upcoming` / `is_live` |
| `release_timestamp` | `PlayerMicroformat.start_timestamp` (Date → Unix s) |

The `innertube` instance is already available in the onesie worker. No new
dependencies are needed.

### 1. ✓ Add `getBasicInfoMetadata()` to `lib/onesie/index.js`

New export that uses `innertube.getBasicInfo()` directly. The Onesie path
(`onesieFormatRequest`) stays completely untouched — it's still used by the
unified route for URL extraction.

```js
/**
 * Resolve a YouTube URL to a videoId and fetch metadata without URL decipher.
 * Uses innertube.getBasicInfo() — one request, no encryption, no decipher.
 *
 * @param {string} youtubeUrl
 * @param {OnesieFormat} format
 * @param {InnerTube} innertube
 */
export async function getBasicInfoMetadata(youtubeUrl, format, innertube) {
  // resolveURL already used in onesieRequest — reuse same pattern
  const resolved = await innertube.resolveURL(youtubeUrl)
  const videoId = resolved.payload.videoId
  if (!videoId) throw new Error('No videoId resolved')

  const info = await innertube.getBasicInfo(videoId)
  const is_upcoming = info.basic_info.is_upcoming

  return {
    title: info.basic_info.title,
    duration: info.basic_info.duration,
    filesize_approx: null,                          // not available without format processing
    channel: info.basic_info.channel?.name ?? null,
    description: info.basic_info.short_description ?? null,
    channel_url: info.basic_info.channel?.url ?? null,
    uploader_url: info.basic_info.channel?.url ?? null,
    ext: formatSelector[format].format,
    _type: format,
    thumbnail: info.basic_info.thumbnail?.[0]?.url ?? null,
    // url intentionally absent — this is discovery only
    live_status: is_upcoming ? 'is_upcoming' : (info.basic_info.is_live ? 'is_live' : null),
    release_timestamp: info.basic_info.start_timestamp
      ? Math.floor(info.basic_info.start_timestamp.getTime() / 1000)
      : null,
  }
}
```

### 2. ✓ Update `lib/onesie-worker.js` to handle `metadataOnly` flag

The worker task data gets a new optional field:

```js
/**
 * @typedef {Object} OnesieRequest
 * @property {string} url
 * @property {OnesieFormat} format
 * @property {boolean} [returnRedirectUrl]   // used by unified (existing)
 * @property {boolean} [metadataOnly]        // used by discover (new)
 */

const handleOnesieRequest = async (taskData) => {
  const { url, format, returnRedirectUrl = true, metadataOnly = false } = taskData

  if (metadataOnly) {
    return getBasicInfoMetadata(url, format, innertube)   // no tvConfig needed
  } else {
    return onesieFormatRequest(url, format, innertube, tvConfig, returnRedirectUrl)
  }
}
```

### 3. ✓ Add `/discover` route in `routes/discover/routes.js`

Mirrors the structure of `routes/unified/routes.js` but:
- Calls `runTask({ url, format, metadataOnly: true })` for YouTube URLs
- Calls the Python yt-dlp server's new `/discover` endpoint for non-YouTube URLs
- Response schema has no `url` field

```
GET /discover?url=<uri>&format=<audio|video>
```

Response schema (subset of unified, no `url`):
```json
{
  "filesize_approx": number | null,
  "duration": number | null,
  "channel": string | null,
  "title": string | null,
  "ext": string | null,
  "_type": string | null,
  "description": string | null,
  "uploader_url": string | null,
  "channel_url": string | null,
  "thumbnail": string | null,
  "live_status": string | null,
  "release_timestamp": number | null
}
```

Register the route in the main router at the same level as `unified`.

### 4. ✓ Add `/discover` endpoint to `ytdlp-server/yt_dlp_api.py`

yt-dlp's `extract_info(url, download=False, process=False)` returns the raw
info dictionary without processing or resolving any format URLs — fast and
reliable for metadata extraction.

```python
@app.route('/discover', methods=['GET'])
def video_discover():
    url = request.args.get('url')
    if url is None:
        abort(400, 'url querystring required')

    ydl_opts = {
        'noplaylist': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False, process=False)
            return jsonify(ydl.sanitize_info(info))
        except Exception as e:
            abort(500, str(e))
```

Note: `process=False` skips format URL resolution entirely. The returned dict
still contains `title`, `duration`, `thumbnail`, `uploader`, `description`,
`upload_date`, `ext`, etc. — everything needed for `finalizeEpisode`.

---

## Changes: `breadcrum.net`

### 5. Add `getYTDLPDiscoveryMetadata()` to `packages/resources/episodes/yt-dlp-api-client.js`

New exported function alongside the existing `getYTDLPMetadata`. Nearly
identical structure but:
- Calls `/discover` instead of `/unified`
- Return type has no `url` field (new `YTDLPDiscoveryMetadata` typedef)
- No internal retry wrapper needed initially — non-YouTube is inherently faster
  and more reliable; YouTube onesie without decipher is also more reliable
- YouTube: keep the same 3-retry default since the onesieRequest call itself can
  still transiently fail

```js
/**
 * @typedef {Omit<YTDLPMetadata, 'url'>} YTDLPDiscoveryMetadata
 */

export async function getYTDLPDiscoveryMetadata({
  url,
  medium,
  ytDLPEndpoint,
  attempt = 0,
  cache,
  maxRetries,
  retryDelayMs = 5000,
}) {
  // same retry wrapper logic as getYTDLPMetadata
  // calls internal getYTDLPDiscoveryMetadataAttempt
  // which sets requestURL.pathname = 'discover'
}
```

### 6. Update `packages/worker/workers/episodes/index.js`

Replace the call to `getYTDLPMetadata` with `getYTDLPDiscoveryMetadata`:

```js
// Before:
const media = await getYTDLPMetadata({
  url, medium, ytDLPEndpoint, attempt: 0, cache, maxRetries: 0,
})
// ...
if (!media?.url) {
  throw new Error('No video URL was found in discovery step')
}

// After:
const media = await getYTDLPDiscoveryMetadata({
  url, medium, ytDLPEndpoint, attempt: 0, cache, maxRetries: 0,
})
// No url check — discovery doesn't return a url
```

The `upcomingCheck` and `finalizeEpisode` calls are unchanged. `finalizeEpisode`
never wrote `media.url` to the DB anyway — it uses the `url` parameter (original
source URL).

Update the import to bring in `getYTDLPDiscoveryMetadata`.

### 7. Update `packages/worker/workers/bookmarks/index.js`

Same change — replace `getYTDLPMetadata` with `getYTDLPDiscoveryMetadata` in
the `resolveEpisode` block.

The error-handling branch that schedules a delayed episode job for failed YouTube
URLs should remain — it's the fallback when even the discover endpoint fails.

### 8. No DB schema changes needed

`episodes.url` already stores the source URL (not the media URL). The podcast
feed redirect already fetches the media URL on demand. No migration required.

---

## yt-dlp-api Call Sites in breadcrum.net

All calls go through `packages/resources/episodes/yt-dlp-api-client.js`.

### `GET /discover` — fast metadata only, no media URL

Used during **episode creation** (worker side only).

| Caller | Context | Retries |
|---|---|---|
| `packages/worker/workers/bookmarks/index.js` | Bookmark pg-boss worker — resolves episode metadata when a bookmark is created | Internal: 3 for YouTube, 0 for others |
| `packages/worker/workers/episodes/index.js` | Episode pg-boss worker — re-resolves metadata for deferred/upcoming episodes | 0 (pg-boss handles retries at job level) |

Both call `getYTDLPDiscoveryMetadata()` → `getYTDLPDiscoveryMetadataAttempt()` → `requestURL.pathname = 'discover'`.

`packages/web/routes/api/episodes/preview/get-preview.js` also calls `/discover` directly (not via the wrapper), returning title/ext/duration/channel/src_type/filesize_approx. The media URL is intentionally absent — the preview UI shows the title as plain text, not a link to the stream.

For YouTube: yt-dlp-api handles this with `innertube.getBasicInfo()` — one unencrypted request, no URL decipher.
For non-YouTube: yt-dlp-api proxies to the Python server's `/discover` which calls `extract_info(process=False)`.

### `GET /unified` — full extraction, returns signed media URL

Used at **playback time** only (web server side).

All three call sites go through `fastify.getYTDLPMetadataWrapper()` defined in `packages/web/plugins/yt-dlp.js`, which wraps `getYTDLPMetadata()` with OTEL timing and the `ytdlpCache`.

| Caller | Context | What it does with `metadata.url` |
|---|---|---|
| `packages/web/routes/api/feeds/_feed/episode/_episode/routes.js` | **Main podcast feed redirect** — the primary playback path | `reply.redirect(metadata.url, 302)` |
| `packages/web/routes/api/feeds/_feed/episode/placeholder/routes.js` | Placeholder episode redirect (uses `flags.placeholder_url`) | `reply.redirect(metadata.url, 302)` |

For YouTube: yt-dlp-api handles this via the Onesie protocol (AES+HMAC encrypted tunnel to `initplayback`), which deciphers the signed stream URL.
For non-YouTube: yt-dlp-api proxies to the Python server's `/info` which calls `extract_info()` with full format processing.

---

## What Stays the Same

- `GET /unified` — unchanged, still used by the podcast feed redirect
- `fastify.getYTDLPMetadataWrapper` in the podcast redirect — unchanged
- `finalizeEpisode` — unchanged (never used `media.url`)
- `upcomingCheck` — unchanged (uses `live_status` + `release_timestamp`)
- pg-boss retry configuration — unchanged
- Episode DB schema — unchanged

---

## Future Work (out of scope for this plan)

- **Proactive URL warming**: After an episode is marked ready, optionally enqueue
  a low-priority job to pre-warm the URL cache (call unified + populate
  `fastify.urlCache`) so the first podcast redirect is a cache HIT.
- **Media extraction queue**: A separate pg-boss queue (`resolveMediaQ`) that
  handles URL extraction asynchronously and stores the result in the URL cache,
  triggered by episode creation or RSS feed generation.
- **Non-YouTube metadata reliability**: Audit which yt-dlp extractors support
  `process=False` cleanly; some may return incomplete data without format
  processing.

---

## File Map

```
yt-dlp-api/
  lib/onesie/index.js                  ✓ added getBasicInfoMetadata() (uses innertube.getBasicInfo)
  lib/onesie/index.test.js             ✓ added getBasicInfoMetadata test + BasicInfoMetadataResults typedef
  lib/onesie-worker.js                 ✓ handles metadataOnly flag
  routes/discover/routes.js            ✓ new route (no url in response, typed via BasicInfoMetadataResults)
  routes/discover/routes.test.js       ✓ 7 subtests, all passing
  ytdlp-server/yt_dlp_api.py          ✓ /discover endpoint (process=False)

breadcrum.net/
  packages/resources/episodes/
    yt-dlp-api-client.js               ✓ added getYTDLPDiscoveryMetadata(), YTDLPDiscoveryMetadata typedef
    resolve-mime-type.js               ✓ updated to use YTDLPDiscoveryMetadata (removed dead url fallback)
  packages/worker/workers/episodes/
    index.js                           ✓ uses getYTDLPDiscoveryMetadata, removed url check
    finaize-episode.js                 ✓ updated to accept YTDLPDiscoveryMetadata
    handle-upcoming.js                 ✓ updated to accept YTDLPDiscoveryMetadata
  packages/worker/workers/bookmarks/
    index.js                           ✓ uses getYTDLPDiscoveryMetadata, simplified episode block (no mediaUrlFound check)
  packages/worker/workers/archives/
    get-site-metadata.js               ✓ updated to accept YTDLPDiscoveryMetadata
  packages/web/routes/api/episodes/preview/
    get-preview.js                     ✓ switched to getYTDLPDiscoveryMetadata, dropped url from response
  packages/web/routes/api/episodes/schemas/
    episode-preview.js                 ✓ removed url field from schema
  packages/web/client/components/bookmark/
    bookmark-edit.js                   ✓ removed media URL link from episode preview UI
```
