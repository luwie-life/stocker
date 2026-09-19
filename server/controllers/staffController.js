const bcrypt = require('bcrypt');
const User = require('../models/User');
const Role = require('../models/Role');
const TenantMembership = require('../models/TenantMembership');
const Branch = require('../models/Branch');
const { ok, created } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { recordAudit } = require('../utils/audit');
const { getPlanLimits } = require('../utils/planLimits');

const list = asyncHandler(async (req, res) => {
  const memberships = await TenantMembership.find({ business: req.business._id }).populate('user', 'fullName email phone status').populate('role', 'name').populate('branch', 'name code').sort({ createdAt: -1 });
  return ok(res, memberships);
});

const create = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, roleName = 'CASHIER', branchId, staffId } = req.body;
  if (!fullName || !email || !password || password.length < 8) throw new AppError('Name, email, and a password of at least 8 characters are required.', 400, 'INVALID_STAFF');
  const limit = getPlanLimits(req.business).staff;
  if (Number.isFinite(limit) && await TenantMembership.countDocuments({ business: req.business._id, status: 'ACTIVE' }) >= limit) {
    throw new AppError(`Your plan allows up to ${limit} active staff accounts. Upgrade to add another.`, 403, 'PLAN_LIMIT_REACHED');
  }
  const role = await Role.findOne({ business: req.business._id, name: roleName });
  if (!role) throw new AppError('That role is not available for this business.', 400, 'ROLE_NOT_FOUND');
  const branch = branchId ? await Branch.findOne({ _id: branchId, business: req.business._id, status: 'ACTIVE' }) : null;
  if (branchId && !branch) throw new AppError('Branch not found.', 404, 'BRANCH_NOT_FOUND');
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
  const user = await User.create({ fullName, email: email.toLowerCase(), phone, passwordHash: await bcrypt.hash(password, 12) });
  const membership = await TenantMembership.create({ user: user._id, business: req.business._id, role: role._id, branch: branch?._id, staffId });
  await recordAudit({ req, action: 'staff.create', entityType: 'TenantMembership', entityId: membership._id, metadata: { userId: user._id, role: role.name, branchId: branch?._id } });
  return created(res, { id: membership._id, user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone }, role: role.name, branch: branch ? { id: branch._id, name: branch.name } : null, staffId });
});

const update = asyncHandler(async (req, res) => {
  const { roleName, branchId, staffId, status } = req.body;
  const membership = await TenantMembership.findOne({ _id: req.params.id, business: req.business._id });
  if (!membership) throw new AppError('Staff member not found.', 404, 'STAFF_NOT_FOUND');
  if (roleName) { const role = await Role.findOne({ business: req.business._id, name: roleName }); if (!role) throw new AppError('Role not found.', 404, 'ROLE_NOT_FOUND'); membership.role = role._id; }
  if (branchId) { const branch = await Branch.findOne({ _id: branchId, business: req.business._id, status: 'ACTIVE' }); if (!branch) throw new AppError('Branch not found.', 404, 'BRANCH_NOT_FOUND'); membership.branch = branch._id; }
  if (staffId !== undefined) membership.staffId = staffId;
  if (status) membership.status = status;
  await membership.save();
  await recordAudit({ req, action: 'staff.update', entityType: 'TenantMembership', entityId: membership._id, metadata: { changes: req.body } });
  return ok(res, membership);
});
module.exports = { list, create, update };
