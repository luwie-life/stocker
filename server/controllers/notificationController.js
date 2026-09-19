const Notification = require('../models/Notification');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => ok(res, await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100)));
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { readAt: new Date() }, { new: true });
  if (!notification) throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
  return ok(res, notification);
});
module.exports = { list, markRead };
