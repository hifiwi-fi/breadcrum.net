import { generateTemplateEmbed } from '@breadcrum/resources/episodes/oembed.js'

/**
 * @import { TypeEpisodeRead } from './schemas/schema-episode-read.js'
 */

/**
 * Enrich an episode with embed HTML at API response time.
 *
 * For well-known providers (YouTube, Vimeo), generates the embed
 * from the episode URL — no stored oembed data needed.
 *
 * For fetched providers (SoundCloud, Spotify, Twitter), passes
 * through the stored oembed data as-is.
 *
 * Mutates the episode object in place.
 *
 * @param {TypeEpisodeRead} episode
 * @returns {void}
 */
export function hydrateEmbed (episode) {
  if (typeof episode.url !== 'string' || episode.url.length === 0) return

  // Try generating a template embed from the URL (YouTube, Vimeo)
  const templateEmbed = generateTemplateEmbed(episode.url)
  if (templateEmbed) {
    episode.oembed = templateEmbed
  }

  // For fetched providers, the stored oembed is used as-is.
  // Nothing to do — episode.oembed already has the data from the DB.
}
