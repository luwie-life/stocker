const AppError = require('../utils/AppError');

// Platform admin is a completely separate privilege domain from tenant
// roles. A tenant Owner is NOT automatically a platform admin. This
// middleware runs on /api/admin/* routes and does NOT call resolveTenant.
function requirePlatformAdmin(allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE']) {
  return (req, res, next) => {
    if (!req.user.platformRole || !allowedRoles.includes(req.user.platformRole)) {
      return next(new AppError('Platform admin access required.', 403, 'NOT_PLATFORM_ADMIN'));
    }
    next();
  };
}

module.exports = requirePlatformAdmin;
