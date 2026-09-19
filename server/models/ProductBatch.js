const mongoose = require('mongoose');

// Pharmacy module — only used when product.tracksBatches is true.
const productBatchSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  batchNumber: { type: String, required: true, trim: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  costPriceMinor: { type: Number, required: true, min: 0 },
  sellingPriceMinor: { type: Number, min: 0 },
}, { timestamps: true });

productBatchSchema.index({ product: 1, branch: 1, batchNumber: 1 }, { unique: true });
productBatchSchema.index({ business: 1, expiryDate: 1 });

module.exports = mongoose.model('ProductBatch', productBatchSchema);
