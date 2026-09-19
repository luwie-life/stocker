const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' }, // null for platform-level actions
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String },
  action: { type: String, required: true }, // e.g. 'sale.create', 'staff.deactivate'
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ip: String,
  userAgent: String,
}, { timestamps: true });

auditLogSchema.index({ business: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
