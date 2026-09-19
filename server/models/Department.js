const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
}, { timestamps: true });

departmentSchema.index({ business: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
