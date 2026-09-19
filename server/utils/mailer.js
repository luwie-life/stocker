function getTransporter() {
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    error.message = 'Nodemailer is not installed. Run "npm install" from the server folder before using password reset.';
    throw error;
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.');
  }
  return nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const from = process.env.MAIL_FROM || process.env.GMAIL_USER;
  await getTransporter().sendMail({
    from, to, subject: 'Reset your stocker password',
    text: `Hello ${name},\n\nReset your stocker password here:\n${resetUrl}\n\nThis link expires in 30 minutes.`,
    html: `<p>Hello ${name},</p><p>Reset your stocker password using the link below. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}

module.exports = { sendPasswordResetEmail };