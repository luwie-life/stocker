const AuditLog = require('../models/AuditLog');

async function recordAudit({ req, action, entityType, entityId, metadata, business, session }) {
  return AuditLog.create([{
    business: business || req.business?._id,
    actor: req.user._id,
    actorRole: req.role?.name || req.user.platformRole,
    action,
    entityType,
    entityId,
    metadata,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }], { session });
}

module.exports = { recordAudit };
