require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const User = require('./models/User');

async function ensureBootstrapSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'admin@stocker.local').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin1234!';

  const existing = await User.findOne({ email });
  if (existing) {
    if (!existing.platformRole) {
      existing.platformRole = 'SUPER_ADMIN';
      await existing.save();
    }
    return existing;
  }

  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await User.create({
    email,
    passwordHash,
    fullName: 'Platform Admin',
    phone: '0000000000',
    status: 'ACTIVE',
    platformRole: 'SUPER_ADMIN',
  });

  console.log('[bootstrap] default super admin ready:', admin.email, 'password:', password);
  return admin;
}

const PORT = process.env.PORT || 4000;
let server;

async function start() {
  try {
    await connectDB();
    await ensureBootstrapSuperAdmin();
    server = app.listen(PORT, () => console.log(`[server] STOCKER API listening on port ${PORT}`));
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 30000);
  } catch (err) {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`[server] ${signal} received; shutting down gracefully`);
  if (server) await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
