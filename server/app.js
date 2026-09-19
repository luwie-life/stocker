const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

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
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((origin) => origin.trim().replace(/\/$/, ''))
  : ['https://stocker-saas.vercel.app', 'http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
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

// Basic rate limiting on auth endpoints — brute-force / credential-stuffing
// mitigation. Tune per your traffic once you have real numbers.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/api/auth', authLimiter, authRoutes);

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
