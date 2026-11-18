# Plan: GeoIP refresh through Backblaze B2

## Goal
Refresh the GeoIP database from MaxMind in the worker on a scheduled job, validate it, store the validated artifact in Backblaze B2, and let the web process bootstrap from the stored artifact without needing MaxMind credentials.

## Current State
- `packages/web/lib/geoip-download.js` downloads MaxMind archives, follows redirects, verifies MaxMind SHA256 files, extracts the `.mmdb`, and writes local metadata.
- `packages/web/plugins/geoip.js` tries a startup download when `MAXMIND_ACCOUNT_ID` and `MAXMIND_LICENSE_KEY` are present, then opens `data/geoip/GeoLite2-City.mmdb`.
- `packages/worker/plugins/pgboss.js` already owns scheduled jobs through `boss.schedule(...)`.
- `packages/worker/config/env-schema.js` has no MaxMind or B2 settings yet.
- Local and CI tests already use injected `envData`, which makes optional service configuration straightforward.

## Design Constraints
- The worker is the only process that talks to MaxMind.
- B2 is the durable source for the current validated database artifact.
- The web process should continue serving with an existing local database if B2 is temporarily unavailable.
- Local development and normal CI must not require MaxMind or B2 secrets.
- Production secrets should be scoped by purpose: worker gets write access, web gets read-only access if the bucket is private.
- Updates must be idempotent, safe to retry, and must not publish a partially validated database.

## Proposed Architecture

### Storage API
Add a small GeoIP storage module in `packages/resources/geoip/` so both web and worker can share it.

Responsibilities:
- `getCurrentManifest()`
- `downloadObjectToFile({ key, destination })`
- `uploadRelease({ mmdbPath, metadataPath, sha256 })`
- `publishCurrentManifest(manifest)`

Drivers:
- `b2-s3`: uses the S3-compatible API against a configured Backblaze endpoint.
- `local`: uses a directory under `data/geoip-store` and is the default outside production.
- `memory` or injected fake: used by unit tests.

Backblaze B2 S3-compatible endpoints use the shape `https://s3.<region>.backblazeb2.com`, and application keys can be scoped by bucket, capabilities, prefix, and expiration.

### Object Layout
Use content-addressed release objects plus a small pointer manifest:

```text
geoip/GeoLite2-City/releases/<sha256>/GeoLite2-City.mmdb
geoip/GeoLite2-City/releases/<sha256>/metadata.json
geoip/GeoLite2-City/current.json
```

`current.json` should be uploaded last and include:

```json
{
  "editionId": "GeoLite2-City",
  "sha256": "<mmdb sha256>",
  "size": 123,
  "releaseKey": "geoip/GeoLite2-City/releases/<sha256>/GeoLite2-City.mmdb",
  "metadataKey": "geoip/GeoLite2-City/releases/<sha256>/metadata.json",
  "maxmind": {
    "etag": "...",
    "lastModified": "..."
  },
  "publishedAt": "...",
  "previousReleases": [
    {
      "sha256": "<previous mmdb sha256>",
      "releaseKey": "geoip/GeoLite2-City/releases/<previous-sha256>/GeoLite2-City.mmdb",
      "metadataKey": "geoip/GeoLite2-City/releases/<previous-sha256>/metadata.json",
      "publishedAt": "...",
      "supersededAt": "..."
    }
  ]
}
```

Publishing the manifest last is the cutover. It makes retries safe: an interrupted job may leave an unused release object, but readers keep using the previous manifest.

Keep the latest published release plus 1-2 previous known-good releases. Store those previous releases in `previousReleases` so rollback is a manifest-only operation when the older release objects are still present.

### Worker Refresh Flow
Move the MaxMind download implementation out of `packages/web` into `packages/resources/geoip/`, then add a worker processor under `packages/worker/workers/geoip/`.

Flow:
- Acquire the scheduled pg-boss job with concurrency `1`.
- Read `current.json` from storage if present.
- Use MaxMind conditional headers from the current manifest when possible.
- Download the MaxMind archive and `.sha256` file only when needed.
- Verify the archive checksum.
- Extract the `.mmdb` to a temporary path.
- Validate the extracted file by opening it with `@maxmind/geoip2-node`.
- Compute the `.mmdb` SHA256.
- If the SHA already exists in the current manifest, update only `lastCheckedAt` style metadata if useful and skip publication.
- Upload release objects.
- Build a new manifest that points at the new release and carries forward the prior current release plus the newest prior entries, capped at 1-2 previous known-good releases.
- Upload `current.json` last to cut over readers atomically.
- After a successful manifest publish, delete or lifecycle-expire releases that are no longer current or listed in `previousReleases`.
- Record counters and structured logs for skipped, refreshed, failed, and validation-failed outcomes.

### Web Bootstrap Flow
Change `packages/web/plugins/geoip.js` so it no longer downloads from MaxMind.

Startup behavior:
- Prefer an existing readable local file at `GEOIP_DATA_DIR/GeoLite2-City.mmdb`.
- If B2/local object storage is configured, fetch `current.json`.
- If the local file is missing or its SHA does not match the manifest, download `releaseKey` to a temporary file, verify SHA, then atomically replace the local file.
- After replacement, open the new file with `@maxmind/geoip2-node` before treating bootstrap as successful.
- If the new file fails local validation, restore the prior local file when present and try the first usable `previousReleases` entry before disabling lookups.
- If bootstrap fails but a readable local file exists, log a warning and continue with the local file.
- If no local file exists, keep the current graceful behavior: log and skip GeoIP lookups.

## Configuration

### Shared
- `GEOIP_EDITION_ID=GeoLite2-City`
- `GEOIP_DATA_DIR=data/geoip`
- `GEOIP_STORAGE_DRIVER=local|b2`
- `GEOIP_STORAGE_PREFIX=geoip`

### Worker Only
- `GEOIP_REFRESH_ENABLED=true|false`
- `GEOIP_REFRESH_CRON=<cron expression>`
- `MAXMIND_ACCOUNT_ID`
- `MAXMIND_LICENSE_KEY`
- `GEOIP_B2_BUCKET`
- `GEOIP_B2_ENDPOINT`
- `GEOIP_B2_REGION`
- `GEOIP_B2_ACCESS_KEY_ID`
- `GEOIP_B2_SECRET_ACCESS_KEY`

### Web Only
- `GEOIP_BOOTSTRAP_ENABLED=true|false`
- `GEOIP_B2_BUCKET`
- `GEOIP_B2_ENDPOINT`
- `GEOIP_B2_REGION`
- `GEOIP_B2_ACCESS_KEY_ID`
- `GEOIP_B2_SECRET_ACCESS_KEY`

For local development, default to `GEOIP_STORAGE_DRIVER=local` and no MaxMind/B2 settings. For CI, use the local or injected fake storage driver.

## Secret Model
- Worker production key: standard B2 application key scoped to the GeoIP bucket and `geoip/` prefix with `listFiles`, `readFiles`, and `writeFiles`.
- Web production key: standard B2 application key scoped to the same bucket and prefix with `listFiles` and `readFiles` only.
- MaxMind credentials exist only in the worker production environment.
- Local development does not require real secrets unless a developer explicitly opts into an integration run.
- CI unit tests do not require real secrets.
- Optional integration tests are gated behind an explicit environment flag and skipped unless all required secrets are present.

## Reliability Notes
- Do not update `current.json` until the MaxMind archive checksum, `.mmdb` extraction, file-open validation, and B2 release upload have all succeeded.
- Always download B2 objects to a temporary file and rename into place only after SHA validation.
- Use content-addressed release keys to make uploads retryable and to avoid overwriting the current published database.
- Retain the latest published release plus 1-2 previous known-good releases; never delete a release that is referenced by `current.json`.
- Rollback should be possible by republishing `current.json` to point at a retained previous release, without re-downloading from MaxMind.
- Treat MaxMind `304` or matching manifest metadata as a successful skipped refresh, not an error.
- Treat B2 upload/download, checksum, and validation failures as job failures so pg-boss retry policy can handle transient problems.
- Keep web startup tolerant: a B2 failure should not break boot if a local validated database is already present.

## Implementation Checklist

### 1. Shared GeoIP Module
- [ ] Move `updateGeoipDatabase` from `packages/web/lib/geoip-download.js` into `packages/resources/geoip/`.
- [ ] Split downloading, archive extraction, SHA calculation, and `.mmdb` validation into separately testable helpers.
- [ ] Add storage interface types with JSDoc.
- [ ] Add local filesystem storage driver.
- [ ] Add B2 S3 storage driver.
- [ ] Add manifest read/write helpers.
- [ ] Add manifest helpers for carrying forward and capping `previousReleases`.

### 2. Worker Scheduled Job
- [ ] Add `packages/resources/geoip/refresh-geoip-queue.js`.
- [ ] Add `packages/worker/workers/geoip/index.js`.
- [ ] Register the queue and schedule in `packages/worker/plugins/pgboss.js`.
- [ ] Add worker env schema fields.
- [ ] Make refresh disabled when required production credentials are missing, with a clear startup log.
- [ ] Implement manifest-last cutover and retain 1-2 previous known-good releases.
- [ ] Add worker metrics for refresh success, skip, failure, validation failure, and duration.

### 3. Web Bootstrap
- [ ] Replace MaxMind startup download in `packages/web/plugins/geoip.js` with B2/local storage bootstrap.
- [ ] Add web env schema fields.
- [ ] Preserve current graceful fallback when no database is available.
- [ ] Validate a newly downloaded local database before opening it for lookups.
- [ ] Fall back to retained previous releases when the current manifest release cannot be downloaded or opened.
- [ ] Verify `Reader.open(... watchForUpdates: true ...)` still observes atomic local file replacement.

### 4. Local Development
- [ ] Default generated env files to local storage and disabled remote refresh.
- [ ] Add a developer script to run the refresh once with `GEOIP_STORAGE_DRIVER=local`.
- [ ] Document how to opt into real MaxMind+B2 refresh locally without requiring it for normal app startup.

### 5. CI and Tests
- [ ] Unit test MaxMind response handling with mocked HTTP responses.
- [ ] Unit test checksum mismatch, missing `.mmdb`, and validation failure paths.
- [ ] Unit test manifest publish ordering with fake storage.
- [ ] Unit test manifest retention of 1-2 previous releases.
- [ ] Unit test rollback bootstrap from `previousReleases`.
- [ ] Unit test local storage bootstrap without secrets.
- [ ] Unit test B2 driver using a mocked S3 client, not real B2.
- [ ] Add optional integration tests gated by explicit env vars.
- [ ] Confirm `pnpm --filter @breadcrum/worker test` and `pnpm --filter @breadcrum/web test` pass without MaxMind or B2 secrets.

### 6. Deployment
- [ ] Create the B2 bucket and `geoip/` prefix.
- [ ] Create the scoped worker write key.
- [ ] Create the scoped web read key if the bucket remains private.
- [ ] Add production worker env vars.
- [ ] Add production web env vars only if web needs direct B2 reads.
- [ ] Run a one-shot worker refresh before relying on the scheduled job.
- [ ] Verify B2 `current.json` points to a readable release object.
- [ ] Verify B2 retains the current release plus 1-2 previous releases after cutover.
- [ ] Verify web starts from B2 on a clean local data directory.

## Acceptance Criteria
- The worker can refresh and publish `GeoLite2-City.mmdb` through a scheduled pg-boss job.
- A failed refresh never changes `current.json`.
- Cutover happens by publishing `current.json` after the new release is fully uploaded and validated.
- B2 retains the current known-good release plus 1-2 previous known-good releases.
- Rollback can be performed by republishing `current.json` to point at a retained previous release.
- Web startup never requires MaxMind credentials.
- Web startup succeeds with a cached local database when B2 is unavailable.
- Local development works with no MaxMind or B2 secrets.
- Normal CI works with no MaxMind or B2 secrets.
- Optional integration tests can exercise real MaxMind and B2 when explicitly enabled.

## Open Questions
- Should B2 object cleanup be handled by a bucket lifecycle rule or by a separate worker cleanup job after preserving the current plus 1-2 previous releases?
- Should the web process read from B2 directly, or should production deployment pre-seed `data/geoip` during release?
- Should refresh publish both City and ASN databases now, or keep the first implementation scoped to `GeoLite2-City`?

## References
- Backblaze B2 S3-compatible endpoints: https://www.backblaze.com/docs/cloud-storage-call-the-s3-compatible-api
- Backblaze B2 application keys: https://www.backblaze.com/docs/cloud-storage-application-keys
- Backblaze B2 application key capabilities: https://www.backblaze.com/docs/cloud-storage-application-key-capabilities
- MaxMind database download/update docs: https://support.maxmind.com/knowledge-base/articles/download-and-update-maxmind-databases
