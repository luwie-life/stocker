const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  contactName: String,
  phone: String,
  email: String,
  address: String,
  notes: String,
}, { timestamps: true });

supplierSchema.index({ business: 1, name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
