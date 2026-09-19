const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: {
    type: String,
    enum: ['OWNER', 'ADMIN', 'MANAGER', 'STOREKEEPER', 'ACCOUNTANT', 'CASHIER', 'SALES_STAFF'],
    required: true,
  },
  permissions: [{ type: String, required: true }],
  isSystemDefault: { type: Boolean, default: true },
}, { timestamps: true });

roleSchema.index({ business: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
