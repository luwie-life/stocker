const mongoose = require('mongoose');

const tenantMembershipSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  staffId: { type: String, trim: true },
  status: { type: String, enum: ['ACTIVE', 'DEACTIVATED'], default: 'ACTIVE' },
}, { timestamps: true });

tenantMembershipSchema.index({ user: 1 }, { unique: true });
tenantMembershipSchema.index({ business: 1, status: 1 });

module.exports = mongoose.model('TenantMembership', tenantMembershipSchema);
