import type { FileKeyParams } from './cache.js'
import type { YTDLPMetaKeyParams } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'

declare module 'fastify' {
  interface FastifyInstance {
    cache: {
      get(key: string): Promise<any>;
      set(key: string, value: any, ttl: number): Promise<void>;
    };

    urlCache: {
      get(params: FileKeyParams): Promise<any>;
      set(params: FileKeyParams, value: any): Promise<void>;
    };

    ytdlpCache: {
      get(params: YTDLPMetaKeyParams): Promise<any>;
      set(params: YTDLPMetaKeyParams, value: any): Promise<void>;
    };
  }
}
