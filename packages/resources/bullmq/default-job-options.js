/**
 * @import { JobsOptions } from 'bullmq'
 */

/** @type {JobsOptions} */
export const defaultJobOptions = {
  removeOnComplete: {
    age: 3600, // keep up to 1 hour
    count: 1000, // keep up to 1000 jobs
  },
  removeOnFail: {
    age: 24 * 3600, // keep up to 24 hours
  }
}
