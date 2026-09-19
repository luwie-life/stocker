const AppError = require('../utils/AppError');

// Server-side permission gate. Must run after authenticate + resolveTenant.
// The internal permission key is logged, not sent to the client.
function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.permissions || !req.permissions.has(permissionKey)) {
      console.warn(`[permission-denied] user=${req.user?._id} missing="${permissionKey}"`);
      return next(new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = requirePermission;
