const mongoose = require('mongoose');

const marketingContentSchema = new mongoose.Schema({
  type: { type: String, enum: ['VIDEO', 'PRICING', 'NOTICE'], default: 'VIDEO' },
  title: { type: String, required: true, trim: true },
  url: { type: String, trim: true },
  embedUrl: { type: String, trim: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MarketingContent', marketingContentSchema);