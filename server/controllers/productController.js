const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { getPlanLimits } = require('../utils/planLimits');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const list = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = { business: req.business._id, status: 'ACTIVE' };
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { sku: { $regex: safeSearch, $options: 'i' } },
      { barcodes: search },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    Product.countDocuments(filter),
  ]);

  return ok(res, items, { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) });
});

const findByBarcode = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ business: req.business._id, barcodes: req.params.barcode, status: 'ACTIVE' });
  if (!product) throw new AppError('Product not found for this barcode.', 404, 'PRODUCT_NOT_FOUND');
  return ok(res, product);
});

const create = asyncHandler(async (req, res) => {
  const limit = getPlanLimits(req.business).products;
  if (Number.isFinite(limit) && await Product.countDocuments({ business: req.business._id, status: 'ACTIVE' }) >= limit) {
    throw new AppError(`Your plan allows up to ${limit} active products. Upgrade to add more.`, 403, 'PLAN_LIMIT_REACHED');
  }
  const product = await Product.create({ ...req.body, business: req.business._id });
  return created(res, product);
});

const update = asyncHandler(async (req, res) => {
  // Always scope by business — never trust the ID alone. Prevents Business
  // A from mutating Business B's product via a guessed/enumerated ID.
  const { name, sku, barcodes, category, department, supplier, imageUrl,
    costPriceMinor, sellingPriceMinor, wholesalePriceMinor, minimumStock,
    tracksBatches, status } = req.body;
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.business._id },
    { name, sku, barcodes, category, department, supplier, imageUrl,
      costPriceMinor, sellingPriceMinor, wholesalePriceMinor, minimumStock,
      tracksBatches, status },
    { new: true, runValidators: true }
  );
  if (!product) throw new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
  return ok(res, product);
});

const remove = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.business._id },
    { status: 'ARCHIVED' },
    { new: true }
  );
  if (!product) throw new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
  return ok(res, product);
});

module.exports = { list, findByBarcode, create, update, remove };
