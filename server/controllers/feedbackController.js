const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const { ok, created } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const create = asyncHandler(async (req, res) => {
  const { type, subject, message } = req.body;
  if (!['PROBLEM', 'FEATURE', 'HELP', 'GENERAL'].includes(type) || !subject || !message) throw new AppError('Feedback type, subject, and message are required.', 400, 'INVALID_FEEDBACK');
  const feedback = await Feedback.create({ business: req.business._id, submittedBy: req.user._id, type, subject, message });
  return created(res, feedback);
});

const list = asyncHandler(async (req, res) => {
  const filter = { business: req.business._id };
  if (!req.permissions.has('settings.manage')) filter.submittedBy = req.user._id;
  const items = await Feedback.find(filter).sort({ createdAt: -1 }).limit(100);
  return ok(res, items);
});

const reply = asyncHandler(async (req, res) => {
  const { status, adminResponse, priority } = req.body;
  const feedback = await Feedback.findOne({ _id: req.params.id, business: req.business._id });
  if (!feedback) throw new AppError('Feedback not found.', 404, 'FEEDBACK_NOT_FOUND');
  if (status && !['NEW', 'REVIEWING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) throw new AppError('Invalid feedback status.', 400, 'INVALID_STATUS');
  feedback.status = status || feedback.status;
  feedback.priority = priority || feedback.priority;
  if (adminResponse !== undefined) { feedback.adminResponse = adminResponse; feedback.respondedAt = new Date(); feedback.respondedBy = req.user._id; }
  await feedback.save();
  if (adminResponse) await Notification.create({ user: feedback.submittedBy, business: feedback.business, type: 'FEEDBACK_REPLY', title: 'Your feedback has a reply', message: adminResponse, metadata: { feedbackId: feedback._id } });
  return ok(res, feedback);
});

module.exports = { create, list, reply };
