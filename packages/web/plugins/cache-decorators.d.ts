import type { FastifyInstance } from 'fastify';
import type { FileKeyParams, YTDLPMetaKeyParams } from './cache.js';

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
