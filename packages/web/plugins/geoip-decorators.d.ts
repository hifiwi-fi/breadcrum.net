import 'fastify'

type GeoIpRegion = {
  country_iso: string | null,
  country_name: string | null,
  region_iso: string | null,
  region_name: string | null,
  city_name: string | null,
  time_zone: string | null,
}

type GeoIpLookup = {
  lookup: (ip: string) => GeoIpRegion | null,
}

declare module 'fastify' {
  interface FastifyInstance {
    geoip?: GeoIpLookup,
  }
}
