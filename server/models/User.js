const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  platformRole: {
    type: String,
    enum: [null, 'SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE'],
    default: null,
  },
  lastLoginAt: { type: Date },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
