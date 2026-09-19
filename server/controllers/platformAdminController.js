const Business = require('../models/Business');
const User = require('../models/User');
const Ambassador = require('../models/Ambassador');
const Commission = require('../models/Commission');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const MarketingContent = require('../models/MarketingContent');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const bcrypt = require('bcrypt');
const PlatformMessage = require('../models/PlatformMessage');

const defaultInvitePassword = 'TempPassword123!';

const overview = asyncHandler(async (req, res) => {
  const [businesses, users, ambassadors, openFeedback, commissions] = await Promise.all([
    Business.countDocuments(), User.countDocuments(), Ambassador.countDocuments({ status: 'ACTIVE' }), Feedback.countDocuments({ status: { $in: ['NEW', 'REVIEWING', 'IN_PROGRESS'] } }), Commission.aggregate([{ $match: { status: { $in: ['PENDING', 'APPROVED', 'PAYABLE'] } } }, { $group: { _id: null, total: { $sum: '$amountMinor' } } }]),
  ]);
  return ok(res, { businesses, users, activeAmbassadors: ambassadors, openFeedback, commissionsOwedMinor: commissions[0]?.total || 0 });
});

const feedback = asyncHandler(async (req, res) => ok(res, await Feedback.find().populate('business', 'name type').populate('submittedBy', 'fullName email').sort({ createdAt: -1 }).limit(200)));

const updateFeedback = asyncHandler(async (req, res) => {
  const feedbackItem = await Feedback.findById(req.params.id);
  if (!feedbackItem) throw new AppError('Feedback not found.', 404, 'FEEDBACK_NOT_FOUND');
  if (req.body.status) feedbackItem.status = req.body.status;
  if (req.body.priority) feedbackItem.priority = req.body.priority;
  if (req.body.adminResponse !== undefined) { feedbackItem.adminResponse = req.body.adminResponse; feedbackItem.respondedAt = new Date(); feedbackItem.respondedBy = req.user._id; }
  await feedbackItem.save();
  if (req.body.adminResponse) await Notification.create({ user: feedbackItem.submittedBy, business: feedbackItem.business, type: 'FEEDBACK_REPLY', title: 'Your feedback has a reply', message: req.body.adminResponse, metadata: { feedbackId: feedbackItem._id } });
  return ok(res, feedbackItem);
});

const inviteSuperAdmin = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email) throw new AppError('Full name and email are required to invite a super admin.', 400, 'INVALID_INVITE');

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new AppError('A user with this email already exists.', 409, 'EMAIL_TAKEN');

  const passwordToUse = password || defaultInvitePassword;
  const user = await User.create({
    fullName: String(fullName).trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(passwordToUse, 12),
    phone: '',
    status: 'ACTIVE',
    platformRole: 'SUPER_ADMIN',
  });

  return ok(res, {
    user: { id: user._id, email: user.email, fullName: user.fullName, platformRole: user.platformRole },
    temporaryPassword: passwordToUse,
    message: 'Super admin invited successfully. Share the temporary password securely.',
  });
});

const marketingContent = asyncHandler(async (req, res) => {
  const items = await MarketingContent.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
});

const saveMarketingContent = asyncHandler(async (req, res) => {
  const { title, type = 'VIDEO', url, embedUrl, description } = req.body || {};
  if (!title || !(url || embedUrl)) {
    throw new AppError('A title and a valid YouTube link are required.', 400, 'INVALID_MARKETING_CONTENT');
  }

  const item = await MarketingContent.create({
    type,
    title,
    url: url || embedUrl,
    embedUrl: embedUrl || url,
    description,
    isActive: true,
    createdBy: req.user._id,
  });

  return ok(res, item);
});

const users = asyncHandler(async (req, res) => {
  const items = await User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(500).lean();
  return ok(res, items);
});

const ambassadors = asyncHandler(async (req, res) => {
  const items = await Ambassador.find()
    .populate('user', 'fullName email phone status createdAt')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const Referral = require('../models/Referral');
  const counts = await Referral.aggregate([{ $group: { _id: '$ambassador', count: { $sum: 1 } } }]);
  const countByAmbassador = new Map(counts.map((item) => [item._id.toString(), item.count]));
  items.forEach((item) => { item.referralCount = countByAmbassador.get(item._id.toString()) || 0; });
  return ok(res, items);
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  if (user._id.toString() === req.user._id.toString()) throw new AppError('You cannot suspend your own account.', 400, 'CANNOT_SUSPEND_SELF');
  user.status = req.body.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  await user.save();
  return ok(res, { id: user._id, status: user.status });
});

const updateAmbassador = asyncHandler(async (req, res) => {
  const ambassador = await Ambassador.findById(req.params.id);
  if (!ambassador) throw new AppError('Ambassador not found.', 404, 'AMBASSADOR_NOT_FOUND');
  if (['PENDING', 'ACTIVE', 'SUSPENDED'].includes(req.body.status)) ambassador.status = req.body.status;
  if (req.body.target) {
    const referrals = Number(req.body.target.referrals);
    if (!Number.isInteger(referrals) || referrals < 0) throw new AppError('Target referrals must be a non-negative whole number.', 400, 'INVALID_TARGET');
    ambassador.target = { referrals, period: req.body.target.period || 'MONTHLY', note: req.body.target.note || '', setBy: req.user._id, setAt: new Date() };
  }
  await ambassador.save();
  return ok(res, ambassador);
});

const messages = asyncHandler(async (req, res) => {
  const items = await PlatformMessage.find({ recipient: req.user._id })
    .populate('sender', 'fullName email platformRole')
    .populate('recipient', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(200);
  return ok(res, items);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { recipientId, audience, subject, message } = req.body || {};
  if (!subject || !message) throw new AppError('Subject and message are required.', 400, 'INVALID_MESSAGE');
  let recipients;
  if (recipientId) {
    recipients = await User.find({ _id: recipientId, status: 'ACTIVE' }).select('_id').lean();
  } else if (audience === 'AMBASSADORS') {
    const profiles = await Ambassador.find({ status: { $in: ['PENDING', 'ACTIVE'] } }).select('user').lean();
    recipients = profiles.map((profile) => ({ _id: profile.user }));
  } else {
    recipients = await User.find({ status: 'ACTIVE', platformRole: null }).select('_id').lean();
  }
  if (!recipients.length) throw new AppError('No recipients matched this message.', 404, 'NO_RECIPIENTS');
  const items = await PlatformMessage.insertMany(recipients.map((recipient) => ({ sender: req.user._id, recipient: recipient._id, subject, message })));
  await Notification.insertMany(recipients.map((recipient) => ({ user: recipient._id, type: 'PLATFORM_MESSAGE', title: subject, message })));
  return ok(res, { count: items.length });
});

const businesses = asyncHandler(async (req, res) => {
  const items = await Business.find().select('name type status subscription createdAt').sort({ createdAt: -1 }).limit(500).lean();
  return ok(res, items);
});

const updateBusinessSubscription = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) throw new AppError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
  const { plan, status, trialDays, accessDays } = req.body || {};
  if (!business.subscription) business.subscription = {};
  if (plan && !['STARTER', 'GROWTH', 'CUSTOM'].includes(plan)) throw new AppError('Invalid plan.', 400, 'INVALID_PLAN');
  if (status && !['TRIAL', 'ACTIVE', 'PAUSED'].includes(status)) throw new AppError('Invalid subscription status.', 400, 'INVALID_SUBSCRIPTION_STATUS');
  if (plan) business.subscription.plan = plan;
  if (status) business.subscription.status = status;
  if (trialDays !== undefined) {
    const days = Number(trialDays);
    if (!Number.isInteger(days) || days < 0 || days > 3650) throw new AppError('Trial days must be a whole number from 0 to 3650.', 400, 'INVALID_TRIAL_DAYS');
    business.subscription.status = 'TRIAL';
    business.subscription.trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  if (accessDays !== undefined) {
    const days = Number(accessDays);
    if (!Number.isInteger(days) || days < 0 || days > 3650) throw new AppError('Access days must be a whole number from 0 to 3650.', 400, 'INVALID_ACCESS_DAYS');
    business.subscription.status = 'ACTIVE';
    business.subscription.accessEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  business.subscription.updatedBy = req.user._id;
  await business.save();
  return ok(res, business);
});

module.exports = { overview, feedback, updateFeedback, inviteSuperAdmin, marketingContent, saveMarketingContent, users, ambassadors, updateUserStatus, updateAmbassador, messages, sendMessage, businesses, updateBusinessSubscription };
