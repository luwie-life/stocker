const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const { accountType, fullName, email, password, phone, businessName, businessType, referralCode, ambassadorApplication } = req.body;
  const result = await authService.registerBusiness({
    accountType,
    fullName,
    email,
    password,
    phone,
    businessName,
    businessType,
    referralCode,
    ambassadorApplication,
  });
  return created(res, result);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  return ok(res, result);
});

const session = asyncHandler(async (req, res) => {
  return ok(res, {
    user: { id: req.user._id, email: req.user.email, fullName: req.user.fullName, platformRole: req.user.platformRole || null },
    isPlatformAdmin: Boolean(req.user.platformRole),
  });
});

const me = asyncHandler(async (req, res) => {
  return ok(res, {
    user: { id: req.user._id, email: req.user.email, fullName: req.user.fullName, platformRole: req.user.platformRole || null },
    business: req.business ? { id: req.business._id, name: req.business.name, type: req.business.type, currency: req.business.currency } : null,
    subscription: req.subscription || null,
    role: req.role?.name || null,
    permissions: Array.from(req.permissions || []),
    branch: req.branch ? { id: req.branch._id, name: req.branch.name } : null,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, currentPassword, newPassword);
  return ok(res, { message: 'Password updated.' });
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  return ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  return ok(res, { message: 'Password reset successfully. You can now sign in.' });
});

module.exports = { register, login, session, me, changePassword, requestPasswordReset, resetPassword };
