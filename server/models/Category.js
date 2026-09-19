const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  name: { type: String, required: true, trim: true },
}, { timestamps: true });

categorySchema.index({ business: 1, department: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
