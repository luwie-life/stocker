const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  barcodes: [{ type: String, trim: true }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  imageUrl: String,

  costPriceMinor: { type: Number, required: true, default: 0, min: 0 },
  sellingPriceMinor: { type: Number, required: true, min: 0 },
  wholesalePriceMinor: { type: Number, min: 0 },

  minimumStock: { type: Number, default: 0, min: 0 },
  tracksBatches: { type: Boolean, default: false },

  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
}, { timestamps: true });

productSchema.index(
  { business: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } }
);
productSchema.index({ business: 1, barcodes: 1 });
productSchema.index({ business: 1, name: 'text' });

module.exports = mongoose.model('Product', productSchema);
