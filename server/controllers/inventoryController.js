const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');
const { adjustInventory } = require('../services/inventoryService');
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

const listForBranch = asyncHandler(async (req, res) => {
  const branchId = req.params.branchId || req.branch?._id;
  const items = await Inventory.find({ business: req.business._id, branch: branchId }).populate('product');
  return ok(res, items);
});

const lowStock = asyncHandler(async (req, res) => {
  const items = await Inventory.aggregate([
    { $match: { business: req.business._id } },
    { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $match: { $expr: { $lte: ['$quantity', '$product.minimumStock'] } } },
  ]);
  return ok(res, items);
});

const movements = asyncHandler(async (req, res) => {
  const filter = { business: req.business._id };
  if (req.query.productId) filter.product = req.query.productId;
  if (req.query.branchId) filter.branch = req.query.branchId;
  const items = await InventoryMovement.find(filter).sort({ createdAt: -1 }).limit(200);
  return ok(res, items);
});

// Manual add/remove — e.g. opening stock, purchase receipt, damage write-off.
const adjust = asyncHandler(async (req, res) => {
  const { branchId, productId, quantity, type, reason } = req.body;
  const [branch, product] = await Promise.all([
    Branch.findOne({ _id: branchId, business: req.business._id }),
    Product.findOne({ _id: productId, business: req.business._id, status: 'ACTIVE' }),
  ]);
  if (!branch) throw new AppError('Branch not found.', 404, 'BRANCH_NOT_FOUND');
  if (!product) throw new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND');

  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      updated = await adjustInventory({
        business: req.business._id,
        branch: branchId,
        product: productId,
        delta: Number(quantity),
        type,
        reason,
        performedBy: req.user._id,
        session,
        allowNegative: req.business.settings.negativeStockAllowed,
      });
    });
  } finally {
    session.endSession();
  }
  return ok(res, updated);
});

module.exports = { listForBranch, lowStock, movements, adjust };
