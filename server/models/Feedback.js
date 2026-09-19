const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['PROBLEM', 'FEATURE', 'HELP', 'GENERAL'], required: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['NEW', 'REVIEWING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], default: 'NEW' },
  priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH'], default: 'NORMAL' },
  adminResponse: String,
  respondedAt: Date,
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

feedbackSchema.index({ business: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('Feedback', feedbackSchema);
