import 'fastify'
import type { Counter, Histogram, Meter, ObservableGauge } from '@opentelemetry/api'

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
      // Archive processing metrics
      archiveJobProcessedCounter: Counter;
      archiveJobFailedCounter: Counter;
      archiveProcessingSeconds: Histogram;
      archiveExtractionSeconds: Histogram;
      archiveFetchSeconds: Histogram;

      // Episode processing metrics
      episodeJobProcessedCounter: Counter;
      episodeJobFailedCounter: Counter;
      episodeProcessingSeconds: Histogram;
      episodeUpcomingCounter: Counter;

      // Bookmark processing metrics
      bookmarkJobProcessedCounter: Counter;
      bookmarkJobFailedCounter: Counter;
      bookmarkProcessingSeconds: Histogram;

      // Site metadata metrics
      siteMetadataSeconds: Histogram;
      siteMetadataSuccessCounter: Counter;
      siteMetadataFailedCounter: Counter;

      // HTTP fetch metrics
      httpFetchSeconds: Histogram;
      httpFetchSuccessCounter: Counter;
      httpFetchFailedCounter: Counter;

      // pg-boss queue metrics (observable gauges)
      queueDeferredGauge: ObservableGauge;
      queueQueuedGauge: ObservableGauge;
      queueActiveGauge: ObservableGauge;
      queueTotalGauge: ObservableGauge;

      // Auth token cleanup metrics
      authTokensCleanedCounter: Counter;
      authTokensCleanupJobCounter: Counter;
      authTokensCleanupDuration: Histogram;

      // Stale resolution cleanup metrics
      staleBookmarksCleanedCounter: Counter;
      staleArchivesCleanedCounter: Counter;
      staleEpisodesCleanedCounter: Counter;
      staleResolutionsCleanupJobCounter: Counter;
      staleResolutionsCleanupDuration: Histogram;
    };
  }
}
