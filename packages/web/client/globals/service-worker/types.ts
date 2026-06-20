import type { BuildOutputEntry, BuildOutputManifest } from '@domstack/static'

export type { BuildOutputEntry, BuildOutputManifest }

export type PrepareLatestManifestCacheResult = {
  current: boolean
  version: string
}

export type WorkerMessage =
  | { type: 'SKIP_WAITING' }
  | { type: 'CHECK_FOR_UPDATES' }
  | { type: 'APPLY_PENDING_CACHE' }
