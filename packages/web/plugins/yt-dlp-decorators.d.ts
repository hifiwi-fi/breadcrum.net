import 'fastify'
import { MediumTypes, YTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'

declare module 'fastify' {
  interface FastifyInstance {
    getYTDLPMetadataWrapper: (params: {
      url: string;
      medium: MediumTypes;
      attempt?: number;
    }) => Promise<YTDLPMetadata>;
  }
}
