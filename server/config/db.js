const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  const conn = mongoose.connection;
  console.log(`[db] connected to MongoDB: ${conn.name}`);

  conn.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });
  conn.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  return conn;
}

module.exports = { connectDB };
