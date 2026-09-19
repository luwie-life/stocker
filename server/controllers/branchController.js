const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const Branch = require('../models/Branch');
const AppError = require('../utils/AppError');
const { getPlanLimits } = require('../utils/planLimits');
const { recordAudit } = require('../utils/audit');

const list = asyncHandler(async (req, res) => {
  const branches = await Branch.find({ business: req.business._id });
  return ok(res, branches);
});

const create = asyncHandler(async (req, res) => {
  const { name, code, address, phone, managerMembership } = req.body;
  const limit = getPlanLimits(req.business).branches;
  if (Number.isFinite(limit) && await Branch.countDocuments({ business: req.business._id, status: 'ACTIVE' }) >= limit) {
    throw new AppError(`Your ${req.business.subscription?.plan || 'Starter'} plan allows ${limit} active branch. Upgrade to add another.`, 403, 'PLAN_LIMIT_REACHED');
  }
  const branch = await Branch.create({ name, code, address, phone, managerMembership, business: req.business._id });
  await recordAudit({ req, action: 'branch.create', entityType: 'Branch', entityId: branch._id, metadata: { name, code } });
  return created(res, branch);
});

const update = asyncHandler(async (req, res) => {
  const branch = await Branch.findOneAndUpdate(
    { _id: req.params.id, business: req.business._id },
    { name: req.body.name, code: req.body.code, address: req.body.address, phone: req.body.phone, managerMembership: req.body.managerMembership, status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!branch) throw new AppError('Branch not found.', 404, 'BRANCH_NOT_FOUND');
  await recordAudit({ req, action: 'branch.update', entityType: 'Branch', entityId: branch._id, metadata: { changes: req.body } });
  return ok(res, branch);
});

module.exports = { list, create, update };
