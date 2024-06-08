import fp from 'fastify-plugin'
import nodemailer from 'nodemailer'
import SQL from '@nearform/sql'

/**
 * @import { Transporter } from 'nodemailer'
 * @import SMTPTransport from 'nodemailer/lib/smtp-transport'
 */

/**
 * This plugins adds nodemailer
 *
 * @see https://github.com/nodemailer/nodemailer
 */
export default fp(async function (fastify, _) {
  /**
   * @type {Transporter | undefined}
   */
  let transport
  if (
    fastify.config.SMTP_HOST &&
    fastify.config.SMTP_PORT &&
    fastify.config.SMTP_SECURE &&
    fastify.config.SMTP_USER &&
    fastify.config.SMTP_PASS
  ) {
    /** @type {SMTPTransport.Options} */
    const opts = {
      host: fastify.config.SMTP_HOST,
      port: fastify.config.SMTP_PORT,
      secure: fastify.config.SMTP_SECURE,
      auth: {
        user: fastify.config.SMTP_USER,
        pass: fastify.config.SMTP_PASS,
      },
      // @ts-ignore
      logger: fastify.log,
      pool: false, // Throws errors when the pool times out
    }
    transport = nodemailer.createTransport(opts)
  }

  /**
   * Adds an unsubscribe line to a text email
   * @param {Object} options
   * @param {string} options.text    The text boy of the email
   * @param {string} options.toEmail The email address to unsubscribe
   */
  function addUnsubscribeLine ({ text, toEmail }) {
    const formatted = (
      text.trim() +
          '\n\n' +
          `Click here to unsubscribe: ${fastify.config.TRANSPORT}://${fastify.config.HOST}/unsubscribe?email=${toEmail}` +
          '\n'
    )
    return formatted
  }

  fastify.decorate('sendEmail',
    /**
     * Send an email
     * @param {Object} options
     * @param {string} options.text    The text boy of the email
     * @param {string} options.toEmail The email address to sent to
     * @param {string} options.subject The email subject
     */
    async function sendEmail ({
      toEmail,
      subject,
      text,
    }) {
      if (transport) {
      // If A transport is configured
        try {
          const blackholeResults = await fastify.pg.query(SQL`
            select email, bounce_count, disabled
            from email_blackhole
            where email = ${toEmail}
            fetch first row only;
          `)
          if (blackholeResults.rows.length === 0 || blackholeResults.rows[0].disabled === false) {
            const results = await transport.sendMail({
              from: `"Breadcrum.net 🥖" <${fastify.config.APP_EMAIL}>`,
              to: toEmail,
              subject,
              text: addUnsubscribeLine({ text, toEmail }),
              headers: {
                'List-Unsubscribe': `<${fastify.config.TRANSPORT}://${fastify.config.HOST}/api/user/email/unsubscribe?email=${toEmail}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            })
            fastify.log.info({ results }, `Sent email: ${toEmail}`)
            return results
          } else {
            fastify.log.warn({ toEmail, subject }, `Skipping message to blackholed email address: ${toEmail}`)
          }
        } catch (err) {
        // Never throw, just log
          fastify.log.error(new Error('Error sending email', { cause: err }))
        }
      } else {
      // Just log without
        fastify.log.warn({ toEmail, subject, text }, 'No SMTP transport configured. Just logging.')
      }
    })
}, {
  name: 'email',
  dependencies: ['env', 'pg'],
})
