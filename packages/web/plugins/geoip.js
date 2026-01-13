/**
 * @import { FastifyPluginAsync } from 'fastify'
 * @import { City } from '@maxmind/geoip2-node'
 */
import fp from 'fastify-plugin'
import { Reader, AddressNotFoundError, ValueError } from '@maxmind/geoip2-node'
import { constants as fsConstants } from 'node:fs'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { updateGeoipDatabase } from '../lib/geoip-download.js'

const defaultGeoipPath = join(process.cwd(), 'data', 'geoip', 'GeoLite2-City.mmdb')
const defaultGeoipDir = join(process.cwd(), 'data', 'geoip')

/**
 * @typedef {object} GeoIpRegion
 * @property {string | null} country_iso
 * @property {string | null} country_name
 * @property {string | null} region_iso
 * @property {string | null} region_name
 * @property {string | null} city_name
 * @property {string | null} time_zone
 */

/**
 * @typedef {object} GeoIpLookup
 * @property {(ip: string) => GeoIpRegion | null} lookup
 */

/**
 * @param {City} response
 * @returns {GeoIpRegion}
 */
function mapCityResponse (response) {
  const region = response.subdivisions?.[0] ?? null
  return {
    country_iso: response.country?.isoCode ?? null,
    country_name: response.country?.names?.en ?? null,
    region_iso: region?.isoCode ?? null,
    region_name: region?.names?.en ?? null,
    city_name: response.city?.names?.en ?? null,
    time_zone: response.location?.timeZone ?? null,
  }
}

/** @type {FastifyPluginAsync} */
async function geoipPlugin (fastify) {
  const { MAXMIND_ACCOUNT_ID, MAXMIND_LICENSE_KEY } = fastify.config

  if (MAXMIND_ACCOUNT_ID && MAXMIND_LICENSE_KEY) {
    try {
      await updateGeoipDatabase({
        accountId: MAXMIND_ACCOUNT_ID,
        licenseKey: MAXMIND_LICENSE_KEY,
        editionId: 'GeoLite2-City',
        dataDir: defaultGeoipDir,
        logger: fastify.log,
      })
    } catch (err) {
      fastify.log.warn({ err }, 'GeoIP database update failed; using existing data if present')
    }
  }

  try {
    await access(defaultGeoipPath, fsConstants.R_OK)
  } catch (err) {
    fastify.log.warn({ err, path: defaultGeoipPath }, 'GeoIP database missing; skipping GeoIP lookups')
    return
  }

  let reader
  try {
    reader = await Reader.open(defaultGeoipPath, {
      cache: { max: 10000 },
      watchForUpdates: true,
    })
  } catch (err) {
    fastify.log.warn({ err, path: defaultGeoipPath }, 'GeoIP database failed to load; skipping GeoIP lookups')
    return
  }

  /** @type {GeoIpLookup} */
  const geoip = {
    lookup (ip) {
      if (!ip) return null
      try {
        const response = reader.city(ip)
        return mapCityResponse(response)
      } catch (err) {
        if (err instanceof AddressNotFoundError || err instanceof ValueError) {
          return null
        }

        const error = /** @type {Error} */ (err)
        fastify.log.debug({ err: error, ip }, 'GeoIP lookup failed')
        return null
      }
    },
  }

  fastify.decorate('geoip', geoip)
}

export default fp(geoipPlugin, {
  name: 'geoip',
  dependencies: ['env'],
})
