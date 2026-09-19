const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  address: String,
  phone: String,
  managerMembership: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantMembership' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

branchSchema.index({ business: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);
