const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  readAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', notificationSchema);
