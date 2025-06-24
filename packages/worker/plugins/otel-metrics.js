import fp from 'fastify-plugin'
import { metrics } from '@opentelemetry/api'

/**
 * This plugin adds OpenTelemetry metrics under the 'otel' decorator.
 */
export default fp(async function (fastify, _) {
  // Create meter for custom metrics using centralized config
  const serviceName = fastify.config.OTEL_SERVICE_NAME
  const serviceVersion = fastify.config.OTEL_SERVICE_VERSION
  const meter = metrics.getMeter(serviceName, serviceVersion)

  fastify.decorate('otel', {
    meter,

    // Archive processing metrics
    archiveJobProcessedCounter: meter.createCounter('breadcrum_archive_job_processed_total', {
      description: 'The number of archive jobs processed',
    }),

    archiveJobFailedCounter: meter.createCounter('breadcrum_archive_job_failed_total', {
      description: 'The number of archive jobs that failed',
    }),

    archiveProcessingSeconds: meter.createHistogram('breadcrum_archive_processing_seconds', {
      description: 'The time it takes to process archive jobs',
      unit: 's',
    }),

    archiveExtractionSeconds: meter.createHistogram('breadcrum_archive_extraction_seconds', {
      description: 'The time it takes to extract archive content',
      unit: 's',
    }),

    archiveFetchSeconds: meter.createHistogram('breadcrum_archive_fetch_seconds', {
      description: 'The time it takes to fetch HTML for archives',
      unit: 's',
    }),

    // Episode processing metrics
    episodeJobProcessedCounter: meter.createCounter('breadcrum_episode_job_processed_total', {
      description: 'The number of episode jobs processed',
    }),

    episodeJobFailedCounter: meter.createCounter('breadcrum_episode_job_failed_total', {
      description: 'The number of episode jobs that failed',
    }),

    episodeProcessingSeconds: meter.createHistogram('breadcrum_episode_processing_seconds', {
      description: 'The time it takes to process episode jobs',
      unit: 's',
    }),

    episodeUpcomingCounter: meter.createCounter('breadcrum_episode_upcoming_total', {
      description: 'The number of upcoming episodes detected',
    }),

    // Bookmark processing metrics
    bookmarkJobProcessedCounter: meter.createCounter('breadcrum_bookmark_job_processed_total', {
      description: 'The number of bookmark jobs processed',
    }),

    bookmarkJobFailedCounter: meter.createCounter('breadcrum_bookmark_job_failed_total', {
      description: 'The number of bookmark jobs that failed',
    }),

    bookmarkProcessingSeconds: meter.createHistogram('breadcrum_bookmark_processing_seconds', {
      description: 'The time it takes to process bookmark jobs',
      unit: 's',
    }),

    // Site metadata metrics
    siteMetadataSeconds: meter.createHistogram('breadcrum_site_metadata_seconds', {
      description: 'The time it takes to extract site metadata',
      unit: 's',
    }),

    siteMetadataSuccessCounter: meter.createCounter('breadcrum_site_metadata_success_total', {
      description: 'The number of successful site metadata extractions',
    }),

    siteMetadataFailedCounter: meter.createCounter('breadcrum_site_metadata_failed_total', {
      description: 'The number of failed site metadata extractions',
    }),

    // HTTP fetch metrics
    httpFetchSeconds: meter.createHistogram('breadcrum_http_fetch_seconds', {
      description: 'The time it takes to fetch HTTP resources',
      unit: 's',
    }),

    httpFetchSuccessCounter: meter.createCounter('breadcrum_http_fetch_success_total', {
      description: 'The number of successful HTTP fetches',
    }),

    httpFetchFailedCounter: meter.createCounter('breadcrum_http_fetch_failed_total', {
      description: 'The number of failed HTTP fetches',
    }),
  })
},
{
  name: 'otel-metrics',
  dependencies: ['env'],
})
