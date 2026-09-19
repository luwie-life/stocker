const Ambassador = require('../models/Ambassador');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const requireAmbassador = asyncHandler(async (req, res, next) => {
  const ambassador = await Ambassador.findOne({ user: req.user._id });
  if (!ambassador) throw new AppError('Ambassador access requires an approved application.', 403, 'NOT_AMBASSADOR');
  req.ambassador = ambassador;
  next();
});

module.exports = requireAmbassador;