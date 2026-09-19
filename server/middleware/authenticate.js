const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the JWT and attaches req.user. Does NOT resolve tenant context —
// that's resolveTenant's job, kept separate so platform-admin-only routes
// can authenticate without requiring a business membership.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Authentication required.', 401, 'NO_TOKEN');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw new AppError('Session expired or invalid. Please log in again.', 401, 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub).lean();
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('Account not found or inactive.', 401, 'INVALID_SESSION');
  }

  req.user = user;
  next();
});

module.exports = authenticate;
