const crypto = require('crypto');
const Ambassador = require('../models/Ambassador');
const Referral = require('../models/Referral');
const Commission = require('../models/Commission');
const User = require('../models/User');
const PlatformMessage = require('../models/PlatformMessage');
const { ok, created } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const me = asyncHandler(async (req, res) => {
  const ambassador = await Ambassador.findOne({ user: req.user._id });
  if (!ambassador) throw new AppError('Ambassador profile not found.', 404, 'AMBASSADOR_NOT_FOUND');
  const [referrals, commissions] = await Promise.all([
    Referral.find({ ambassador: ambassador._id }).populate('business', 'name type status createdAt').sort({ createdAt: -1 }),
    Commission.find({ ambassador: ambassador._id }).populate('business', 'name').sort({ createdAt: -1 }),
  ]);
  return ok(res, { ambassador, referrals, commissions });
});

const create = asyncHandler(async (req, res) => {
  const existing = await Ambassador.findOne({ user: req.user._id });
  if (existing) return ok(res, existing);
  const base = req.user.fullName.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'STOCKER';
  const referralCode = `${base}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const ambassador = await Ambassador.create({ user: req.user._id, referralCode, status: 'PENDING' });
  return created(res, ambassador);
});

const referrals = asyncHandler(async (req, res) => {
  const ambassador = await Ambassador.findOne({ user: req.user._id });
  if (!ambassador) throw new AppError('Ambassador profile not found.', 404, 'AMBASSADOR_NOT_FOUND');
  return ok(res, await Referral.find({ ambassador: ambassador._id }).populate('business', 'name type status createdAt').sort({ createdAt: -1 }));
});

const messages = asyncHandler(async (req, res) => {
  const items = await PlatformMessage.find({ recipient: req.user._id })
    .populate('sender', 'fullName email platformRole')
    .sort({ createdAt: -1 })
    .limit(100);
  return ok(res, items);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { subject, message } = req.body || {};
  if (!subject || !message) throw new AppError('Subject and message are required.', 400, 'INVALID_MESSAGE');
  const admins = await User.find({ platformRole: { $ne: null }, status: 'ACTIVE' }).select('_id').lean();
  if (!admins.length) throw new AppError('No platform admin is available to receive this message.', 503, 'NO_PLATFORM_ADMIN');
  const items = await PlatformMessage.insertMany(admins.map((admin) => ({ sender: req.user._id, recipient: admin._id, subject, message })));
  return created(res, { count: items.length });
});

module.exports = { me, create, referrals, messages, sendMessage };
