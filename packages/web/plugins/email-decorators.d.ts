import 'fastify'
import type { SentMessageInfo } from 'nodemailer'

declare module 'fastify' {
  interface FastifyInstance {
    sendEmail: (options: {
      toEmail: string;
      subject: string;
      text: string;
      includeUnsubscribe?: boolean;
    }) => Promise<SentMessageInfo | undefined>;
  }
}
