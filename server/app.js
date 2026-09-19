const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
let compression;
try { compression = require('compression'); } catch { compression = null; }

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const branchRoutes = require('./routes/branchRoutes');
const saleRoutes = require('./routes/saleRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const staffRoutes = require('./routes/staffRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const ambassadorRoutes = require('./routes/ambassadorRoutes');
const platformAdminRoutes = require('./routes/platformAdminRoutes');
const billingRoutes = require('./routes/billingRoutes');
const billingWebhookRoutes = require('./routes/billingWebhookRoutes');
const marketingRoutes = require('./routes/marketingRoutes');

const app = express();
const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean)
  : [];
const allowedOrigins = new Set([
  'https://stocker-saas.vercel.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  ...configuredOrigins,
]);

app.use(helmet());
if (compression) app.use(compression({ threshold: 1024 }));
app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin?.replace(/\/$/, '');
    const isVercelPreview = normalizedOrigin?.endsWith('.vercel.app');
    if (!origin || allowedOrigins.has(normalizedOrigin) || isVercelPreview) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/billing/webhook', billingWebhookRoutes);
app.use(express.json({ limit: '2mb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Auth routes apply their own limits so repeated login attempts cannot block
// password recovery for every user behind the same proxy.
app.set('trust proxy', 1);
app.set('etag', 'strong');
app.set('x-powered-by', false);
app.use((req, res, next) => {
  req.setTimeout(Number(process.env.REQUEST_TIMEOUT_MS || 30000));
  next();
});
app.use('/api/auth', authRoutes);

app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ambassadors', ambassadorRoutes);
app.use('/api/platform-admin', platformAdminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/marketing', marketingRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found.', code: 'NOT_FOUND' });
});

app.use(errorHandler);

module.exports = app;
