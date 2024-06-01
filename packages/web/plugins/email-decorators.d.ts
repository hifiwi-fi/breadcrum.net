import 'fastify'
import type { SentMessageInfo } from 'nodemailer';

declare module 'fastify' {
  interface FastifyInstance {
    sendEmail: (options: {
      toEmail: string;
      subject: string;
      text: string;
    }) => Promise<SentMessageInfo | undefined>;
  }
}
