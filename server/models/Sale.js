const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true }, // snapshot at time of sale
  quantity: { type: Number, required: true, min: 1 },
  unitPriceMinor: { type: Number, required: true, min: 0 }, // snapshot
  discountMinor: { type: Number, default: 0, min: 0 },
  subtotalMinor: { type: Number, required: true, min: 0 },
  refundedQuantity: { type: Number, default: 0, min: 0 },
}, { _id: true });

const paymentEntrySchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['CASH', 'TRANSFER', 'POS', 'BANK', 'CREDIT', 'MOBILE_MONEY'],
    required: true,
  },
  amountMinor: { type: Number, required: true, min: 0 },
  reference: String,
}, { _id: false });

const saleSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  saleNumber: { type: String, required: true },
  cashierMembership: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantMembership', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  items: { type: [saleItemSchema], required: true, validate: (v) => v.length > 0 },

  subtotalMinor: { type: Number, required: true, min: 0 },
  discountMinor: { type: Number, default: 0, min: 0 },
  taxMinor: { type: Number, default: 0, min: 0 },
  totalMinor: { type: Number, required: true, min: 0 },

  payments: { type: [paymentEntrySchema], required: true },
  amountPaidMinor: { type: Number, required: true, min: 0 },
  balanceMinor: { type: Number, required: true, default: 0 },

  paymentStatus: {
    type: String,
    enum: ['PAID', 'PARTIAL', 'UNPAID'],
    required: true,
  },

  refundedAmountMinor: { type: Number, default: 0, min: 0 },

  status: {
    type: String,
    enum: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOID'],
    default: 'COMPLETED',
  },

  currency: { type: String, required: true },
}, { timestamps: true });

saleSchema.index({ business: 1, saleNumber: 1 }, { unique: true });
saleSchema.index({ business: 1, branch: 1, createdAt: -1 });
saleSchema.index({ business: 1, cashierMembership: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
