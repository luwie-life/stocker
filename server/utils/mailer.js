const https = require('https');

function sendWithResend({ from, to, subject, text, html }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    });

    const request = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (response) => {
        let responseBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });

        response.on('end', () => {
          let result;

          try {
            result = JSON.parse(responseBody);
          } catch {
            return reject(
              new Error('Resend returned an unreadable response.')
            );
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            return reject(
              new Error(
                `Resend email failed: ${
                  result.message || result.error || response.statusCode
                }`
              )
            );
          }

          resolve(result);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('Resend email request timed out.'));
    });

    request.on('error', reject);
    request.end(body);
  });
}

function getGmailTransporter() {
  const nodemailer = require('nodemailer');

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error(
      'Email is not configured. Set RESEND_API_KEY or configure Gmail SMTP.'
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const subject = 'Reset your Stocker password';

  const text =
    `Hello ${name},\n\n` +
    `Reset your Stocker password here:\n${resetUrl}\n\n` +
    'This link expires in 30 minutes. ' +
    'If you did not request this, you can ignore this email.';

  const html =
    `<p>Hello ${name},</p>` +
    '<p>Reset your Stocker password using the link below. ' +
    'It expires in 30 minutes.</p>' +
    `<p><a href="${resetUrl}">Reset password</a></p>` +
    '<p>If you did not request this, you can ignore this email.</p>';

  if (process.env.RESEND_API_KEY) {
    return sendWithResend({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      text,
      html,
    });
  }

  const transporter = getGmailTransporter();

  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.GMAIL_USER,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendPasswordResetEmail };
