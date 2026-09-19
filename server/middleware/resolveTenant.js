const TenantMembership = require('../models/TenantMembership');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Derives tenant context ONLY from the authenticated user's membership.
// A client-supplied businessId/tenantId is NEVER trusted for authorization —
// even if the frontend sends one, it is ignored here.
const resolveTenant = asyncHandler(async (req, res, next) => {
  const membership = await TenantMembership.findOne({ user: req.user._id })
    .populate('role')
    .populate('business')
    .populate('branch');

  if (!membership || membership.status !== 'ACTIVE') {
    throw new AppError('No active business membership found for this account.', 403, 'NO_MEMBERSHIP');
  }

  if (membership.business.status !== 'ACTIVE') {
    throw new AppError('This business account is currently suspended.', 403, 'BUSINESS_SUSPENDED');
  }

  const subscription = membership.business.subscription || {};
  const now = new Date();
  const trialActive = subscription.status === 'TRIAL' && subscription.trialEndsAt && now <= subscription.trialEndsAt;
  const paidActive = subscription.status === 'ACTIVE' && (!subscription.accessEndsAt || now <= subscription.accessEndsAt);
  if (!req.allowExpiredSubscription && !trialActive && !paidActive) {
    throw new AppError('Your trial or subscription has ended. Contact the platform team to renew access.', 402, 'SUBSCRIPTION_REQUIRED');
  }

  req.membership = membership;
  req.business = membership.business;
  req.role = membership.role;
  req.permissions = new Set(membership.role.permissions);
  req.branch = membership.branch || null;
  req.subscription = subscription;

  next();
});

module.exports = resolveTenant;
