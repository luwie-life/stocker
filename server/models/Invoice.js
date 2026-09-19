const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPriceMinor: { type: Number, required: true, min: 0 },
  subtotalMinor: { type: Number, required: true, min: 0 },
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  invoiceNumber: { type: String, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  lines: { type: [invoiceLineSchema], required: true, validate: (value) => value.length > 0 },
  subtotalMinor: { type: Number, required: true, min: 0 },
  discountMinor: { type: Number, default: 0, min: 0 },
  taxMinor: { type: Number, default: 0, min: 0 },
  totalMinor: { type: Number, required: true, min: 0 },
  dueDate: Date,
  notes: String,
  status: { type: String, enum: ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'], default: 'DRAFT' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

invoiceSchema.index({ business: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ business: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
