const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  ambassador: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambassador', required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  billingPeriod: { type: String, required: true },
  grossAmountMinor: { type: Number, required: true, min: 0 },
  percentage: { type: Number, required: true, default: 10 },
  amountMinor: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'PAYABLE', 'PAID', 'REVERSED'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now },
  approvedAt: Date,
  paidAt: Date,
  reversalReason: String,
}, { timestamps: false });
commissionSchema.index({ ambassador: 1, business: 1, billingPeriod: 1 }, { unique: true });
module.exports = mongoose.model('Commission', commissionSchema);
