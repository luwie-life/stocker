const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 2),
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
    maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_TIME_MS || 30000),
  });

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
