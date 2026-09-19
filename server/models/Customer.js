const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  phone: String,
  email: String,
  address: String,
  notes: String,
}, { timestamps: true });

customerSchema.index({ business: 1, name: 1 });
customerSchema.index({ business: 1, phone: 1 });

module.exports = mongoose.model('Customer', customerSchema);
