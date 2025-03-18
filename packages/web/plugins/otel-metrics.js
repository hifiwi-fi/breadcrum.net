import fp from 'fastify-plugin'
import { metrics } from '@opentelemetry/api'

/**
 * This plugin adds OpenTelemetry metrics under the 'otel' decorator.
 */
export default fp(async function (fastify, _) {
  // Create meter for custom metrics
  const meter = metrics.getMeter('breadcrum-web', '1.0.0')

  fastify.decorate('otel', {
    meter,

    bookmarkCreatedCounter: meter.createCounter('breadcrum_bookmark_created_total', {
      description: 'The number of times bookmarks are created',
    }),

    bookmarkDeleteCounter: meter.createCounter('breadcrum_bookmark_deleted_total', {
      description: 'The number of times bookmarks are deleted',
    }),

    bookmarkEditCounter: meter.createCounter('breadcrum_bookmark_edit_total', {
      description: 'The number of times bookmarks are edited',
    }),

    episodeCounter: meter.createCounter('breadcrum_episode_created_total', {
      description: 'The number of times episodes are created',
    }),

    episodeEditCounter: meter.createCounter('breadcrum_episode_edit_total', {
      description: 'The number of times episodes are edited',
    }),

    archiveEditCounter: meter.createCounter('breadcrum_archive_edit_total', {
      description: 'The number of times archives are edited',
    }),

    episodeDeleteCounter: meter.createCounter('breadcrum_episode_delete_total', {
      description: 'The number of times episodes are deleted',
    }),

    archiveDeleteCounter: meter.createCounter('breadcrum_archive_delete_total', {
      description: 'The number of times archives are deleted',
    }),

    tagAppliedCounter: meter.createCounter('breadcrum_tag_applied_total', {
      description: 'The number of times tags are applied to bookmarks',
    }),

    tagRemovedCounter: meter.createCounter('breadcrum_tag_removed_total', {
      description: 'The number of times tags are removed from bookmarks',
    }),

    userCreatedCounter: meter.createCounter('breadcrum_user_created_total', {
      description: 'The number of times a new user is created',
    }),

    ytdlpSeconds: meter.createHistogram('breadcrum_ytdlp_seconds', {
      description: 'The time it takes for ytdlp items to finish',
      unit: 's',
    }),

    siteMetaSeconds: meter.createHistogram('breadcrum_site_meta_seconds', {
      description: 'The time it takes for site meta extraction',
      unit: 's',
    }),

    archiveSeconds: meter.createHistogram('breadcrum_archive_seconds', {
      description: 'The time it takes for readability archive extraction',
      unit: 's',
    }),

    archiveCounter: meter.createCounter('breadcrum_archive_created_total', {
      description: 'The number of times a readability archive is created',
    }),

    jwtVerifyCounter: meter.createCounter('breadcrum_jwt_verify_total', {
      description: 'The number of times a jwt token attempts verification',
    }),

    jwtVerifyFailCounter: meter.createCounter('breadcrum_jwt_verify_fail_total', {
      description: 'The number of times a jwt token verification fails',
    }),

    jwtCreatedCounter: meter.createCounter('breadcrum_jwt_created_total', {
      description: 'The number of times a jwt token is created',
    }),

    // Podcast feed metrics
    podcastFeedDeleteCounter: meter.createCounter('breadcrum_podcast_feed_delete_total', {
      description: 'The number of times podcast feeds are deleted',
    }),

    podcastFeedEditCounter: meter.createCounter('breadcrum_podcast_feed_edit_total', {
      description: 'The number of times podcast feeds are edited',
    }),
  })
},
{
  name: 'otel-metrics',
  dependencies: ['env'],
})
