const Invoice = require('../models/Invoice');
const Branch = require('../models/Branch');
const { nextSequence } = require('../models/Counter');
const { ok, created } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { recordAudit } = require('../utils/audit');

const create = asyncHandler(async (req, res) => {
  const { branchId, customer, lines, discountMinor = 0, taxMinor = 0, dueDate, notes, status = 'DRAFT' } = req.body;
  if (!Array.isArray(lines) || lines.length === 0) throw new AppError('At least one invoice line is required.', 400, 'INVALID_LINES');
  const branch = await Branch.findOne({ _id: branchId || req.branch?._id, business: req.business._id, status: 'ACTIVE' });
  if (!branch) throw new AppError('Branch not found.', 404, 'BRANCH_NOT_FOUND');
  const normalizedLines = lines.map((line) => {
    const quantity = Number(line.quantity);
    const unitPriceMinor = Number(line.unitPriceMinor);
    if (!line.description || !Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(unitPriceMinor) || unitPriceMinor < 0) throw new AppError('Invoice lines contain invalid values.', 400, 'INVALID_LINES');
    return { product: line.product, description: line.description, quantity, unitPriceMinor, subtotalMinor: quantity * unitPriceMinor };
  });
  const subtotalMinor = normalizedLines.reduce((sum, line) => sum + line.subtotalMinor, 0);
  const totalMinor = subtotalMinor - Math.min(Number(discountMinor) || 0, subtotalMinor) + (Number(taxMinor) || 0);
  if (!['DRAFT', 'ISSUED'].includes(status)) throw new AppError('New invoices can only be drafts or issued.', 400, 'INVALID_STATUS');
  const session = await mongoose.startSession();
  let invoice;
  try {
    await session.withTransaction(async () => {
      const sequence = await nextSequence(req.business._id, 'INVOICE', session);
      [invoice] = await Invoice.create([{ business: req.business._id, branch: branch._id, invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(sequence).padStart(4, '0')}`, customer, lines: normalizedLines, subtotalMinor, discountMinor: Number(discountMinor) || 0, taxMinor: Number(taxMinor) || 0, totalMinor, dueDate, notes, status, createdBy: req.user._id }], { session });
      await recordAudit({ req, action: 'invoice.create', entityType: 'Invoice', entityId: invoice._id, metadata: { invoiceNumber: invoice.invoiceNumber, totalMinor: invoice.totalMinor }, session });
    });
  } finally { session.endSession(); }
  return created(res, invoice);
});

const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter = { business: req.business._id };
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([Invoice.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Invoice.countDocuments(filter)]);
  return ok(res, items, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, business: req.business._id });
  if (!invoice) throw new AppError('Invoice not found.', 404, 'INVOICE_NOT_FOUND');
  return ok(res, invoice);
});

module.exports = { create, list, getOne };
