import 'fastify'
import type { Counter, Histogram, Meter } from '@opentelemetry/api'

declare module 'fastify' {
  interface FastifyInstance {
    otel: {
      meter: Meter;

      // Bookmark metrics
      bookmarkCreatedCounter: Counter;
      bookmarkDeleteCounter: Counter;
      bookmarkEditCounter: Counter;

      // Episode metrics
      episodeCounter: Counter;
      episodeEditCounter: Counter;
      episodeDeleteCounter: Counter;

      // Archive metrics
      archiveEditCounter: Counter;
      archiveDeleteCounter: Counter;
      archiveCounter: Counter;

      // Tag metrics
      tagAppliedCounter: Counter;
      tagRemovedCounter: Counter;

      // User metrics
      userCreatedCounter: Counter;

      // Timing metrics
      ytdlpSeconds: Histogram;
      siteMetaSeconds: Histogram;
      archiveSeconds: Histogram;

      // JWT metrics
      jwtVerifyCounter: Counter;
      jwtVerifyFailCounter: Counter;
      jwtCreatedCounter: Counter;

      // Podcast feed metrics
      podcastFeedDeleteCounter: Counter;
      podcastFeedEditCounter: Counter;
    };
  }
}
