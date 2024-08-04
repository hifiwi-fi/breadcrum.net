import 'fastify'
import { Counter, Histogram } from 'prom-client'

declare module 'fastify' {
  interface FastifyInstance {
    prom: {
      bookmarkCreatedCounter: Counter<string>;
      bookmarkDeleteCounter: Counter<string>;
      bookmarkEditCounter: Counter<string>;
      episodeCounter: Counter<string>;
      episodeEditCounter: Counter<string>;
      archiveEditCounter: Counter<string>;
      episodeDeleteCounter: Counter<string>;
      archiveDeleteCounter: Counter<string>;
      tagAppliedCounter: Counter<string>;
      tagRemovedCounter: Counter<string>;
      userCreatedCounter: Counter<string>;
      ytdlpSeconds: Histogram<string>;
      siteMetaSeconds: Histogram<string>;
      archiveSeconds: Histogram<string>;
      archiveCounter: Counter<string>;
    };
  }
}
