export const cachePrefix = 'breadcrum-static-pwa'
export const legacyCachePrefix = 'breadcrum-'
export const maxPrecacheBytes = 2 * 1024 * 1024
export const offlineFallbackUrl = '/offline/'
export const pwaDevOptInKey = 'breadcrum:pwa-dev'
export const serviceWorkerPolicyDefineName = '__BREADCRUM_WORKBOX_POLICY__'
export const serviceWorkerScope = '/'
export const serviceWorkerUrl = '/service-worker.js'
export const workboxOfflineFallbackCacheName = 'workbox-offline-fallbacks'

export const cachePrefixes = [cachePrefix, legacyCachePrefix, workboxOfflineFallbackCacheName] as const

export type BreadcrumPwaManifestVars = {
  offline?: boolean
  precache?: boolean
}

export type BreadcrumPwaPageVars = BreadcrumPwaManifestVars & {
  title?: string
}

export type BreadcrumPwaPolicy = {
  offlineFallbackUrl: string
}

export type WorkboxPrecacheEntry = {
  integrity?: string
  revision: string | null
  url: string
}

export type BreadcrumWorkboxPolicy = {
  offlineFallbackUrl: string
  precacheManifest: WorkboxPrecacheEntry[]
  version: string
}
