const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const Sale = require('../models/Sale');
const AppError = require('../utils/AppError');
const saleService = require('../services/saleService');
const refundService = require('../services/refundService');

const create = asyncHandler(async (req, res) => {
  const { cart, payments, customer } = req.body;
  const branchId = req.body.branchId || req.branch?._id;
  if (!branchId) throw new AppError('No branch specified or assigned for this sale.', 400, 'NO_BRANCH');

  const Branch = require('../models/Branch');
  const branch = await Branch.findOne({ _id: branchId, business: req.business._id });
  if (!branch) throw new AppError('Branch not found.', 404, 'BRANCH_NOT_FOUND');

  const sale = await saleService.createSale({
    business: req.business,
    branch,
    cashierMembership: req.membership,
    cart,
    payments,
    customer,
    allowNegativeStock: req.business.settings.negativeStockAllowed,
  });

  return created(res, sale);
});

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, branchId, from, to } = req.query;
  const filter = { business: req.business._id };
  if (branchId) filter.branch = branchId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Sale.countDocuments(filter),
  ]);

  return ok(res, items, { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, business: req.business._id });
  if (!sale) throw new AppError('Sale not found.', 404, 'SALE_NOT_FOUND');
  return ok(res, sale);
});

const refund = asyncHandler(async (req, res) => {
  const { items, reason } = req.body;
  const sale = await Sale.findOne({ _id: req.params.id, business: req.business._id });
  if (!sale) throw new AppError('Sale not found.', 404, 'SALE_NOT_FOUND');

  const result = await refundService.createRefund({
    business: req.business,
    branch: { _id: sale.branch },
    saleId: sale._id,
    items,
    reason,
    performedBy: req.user._id,
  });

  return created(res, result);
});

module.exports = { create, list, getOne, refund };
