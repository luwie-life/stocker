const mongoose = require('mongoose');

const refundItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  amountMinor: { type: Number, required: true, min: 0 },
}, { _id: false });

const refundSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  refundNumber: { type: String, required: true },
  items: { type: [refundItemSchema], required: true },
  totalAmountMinor: { type: Number, required: true, min: 0 },
  reason: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['COMPLETED', 'REVERSED'], default: 'COMPLETED' },
}, { timestamps: true });

refundSchema.index({ business: 1, refundNumber: 1 }, { unique: true });
refundSchema.index({ business: 1, sale: 1 });

module.exports = mongoose.model('Refund', refundSchema);
