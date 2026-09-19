const mongoose = require('mongoose');

const ambassadorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  referralCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED'], default: 'PENDING' },
    application: {
      phone: String,
      location: String,
      experience: String,
      audience: String,
      note: String,
    },
  target: {
    referrals: { type: Number, default: 0 },
    period: { type: String, default: 'MONTHLY' },
    note: String,
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    setAt: Date,
  },
  payoutDetails: { bankName: String, accountName: String, accountNumber: String },
}, { timestamps: true });
module.exports = mongoose.model('Ambassador', ambassadorSchema);
