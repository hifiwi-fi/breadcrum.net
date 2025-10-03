import 'fastify'
import type { Counter, Histogram, Meter, ObservableGauge } from '@opentelemetry/api'

declare module 'fastify' {
  interface FastifyInstance {
    otel: {
      meter: Meter;

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
    };
  }
}
