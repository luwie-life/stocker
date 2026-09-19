const mongoose = require('mongoose');

const platformMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  readAt: Date,
}, { timestamps: true });

platformMessageSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('PlatformMessage', platformMessageSchema);