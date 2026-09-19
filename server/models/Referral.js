const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  ambassador: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambassador', required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true },
  attributedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['ATTRIBUTED', 'CONVERTED', 'REJECTED'], default: 'ATTRIBUTED' },
}, { timestamps: true });
referralSchema.index({ ambassador: 1, createdAt: -1 });
module.exports = mongoose.model('Referral', referralSchema);
