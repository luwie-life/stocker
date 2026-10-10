const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;

  if (!user || !password) {
    throw new Error(
      'Email configuration missing: set GMAIL_USER and GMAIL_APP_PASSWORD.'
    );
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,

    auth: {
      user,
      pass: password,
    },

    pool: true,
    maxConnections: 2,
    maxMessages: 100,

    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character];
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  if (!to || !resetUrl) {
    throw new Error('Recipient email and reset URL are required.');
  }

  const sender = process.env.GMAIL_USER;

  const safeName = escapeHtml(name || 'there');
  const safeResetUrl = escapeHtml(resetUrl);

  const subject = 'Reset your Stocker password';

  const text = [
    `Hello ${name || 'there'},`,
    '',
    'We received a request to reset your Stocker password.',
    '',
    'Use the link below to choose a new password:',
    resetUrl,
    '',
    'This link expires in 30 minutes.',
    'If you did not request this, you can ignore this email.',
    '',
    'Stocker Support',
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your Stocker password</title>
      </head>

      <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222;">
        <div style="max-width:520px;margin:40px auto;padding:32px 24px;background:#ffffff;border:1px solid #e8e8e8;border-radius:12px;">

          <h1 style="margin:0 0 24px;font-size:24px;color:#222;">
            Stocker
          </h1>

          <h2 style="font-size:20px;margin:0 0 16px;">
            Reset your password
          </h2>

          <p style="font-size:15px;line-height:1.7;">
            Hello ${safeName},
          </p>

          <p style="font-size:15px;line-height:1.7;">
            We received a request to reset your Stocker password.
            Click the button below to choose a new one.
          </p>

          <p style="margin:28px 0;">
            <a
              href="${safeResetUrl}"
              style="display:inline-block;padding:13px 22px;background:#222;color:#fff;text-decoration:none;border-radius:7px;font-size:14px;font-weight:bold;"
            >
              Reset password
            </a>
          </p>

          <p style="font-size:13px;line-height:1.7;color:#666;">
            This link expires in 30 minutes.
          </p>

          <p style="font-size:13px;line-height:1.7;color:#666;">
            If you didn't request this reset, you can safely ignore this email.
            Your password will remain unchanged.
          </p>

          <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">

          <p style="font-size:12px;line-height:1.6;color:#888;">
            Stocker Support
          </p>
        </div>
      </body>
    </html>
  `;

  const result = await getTransporter().sendMail({
    from: `"Stocker" <${sender}>`,
    to,
    subject,
    text,
    html,
  });

  console.log('[mailer] Password reset email sent:', {
    messageId: result.messageId,
  });

  return result;
}

module.exports = {
  sendPasswordResetEmail,
};
