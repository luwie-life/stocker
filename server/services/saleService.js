const mongoose = require('mongoose');

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { nextSequence } = require('../models/Counter');
const { adjustInventory } = require('./inventoryService');
const AppError = require('../utils/AppError');

function buildSaleNumber(businessId, seq) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `STK-${date}-${String(seq).padStart(4, '0')}`;
}

// The full atomic POS transaction, per spec section 17:
// validate -> create sale+items -> deduct inventory -> movement -> audit log.
// Every step runs inside one MongoDB transaction. If ANY step fails
// (insufficient stock, bad price, payment mismatch), the whole thing rolls
// back — a sale can never be left half-completed.
async function createSale({ business, branch, cashierMembership, cart, payments, customer, clientRequestId, allowNegativeStock }) {
  if (!cart || cart.length === 0) {
    throw new AppError('Cart is empty.', 400, 'EMPTY_CART');
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    throw new AppError('At least one payment entry is required.', 400, 'INVALID_PAYMENTS');
  }
  if (payments.some((payment) => !payment || !Number.isInteger(payment.amountMinor) || payment.amountMinor < 0)) {
    throw new AppError('Payment amounts must be non-negative minor units.', 400, 'INVALID_PAYMENTS');
  }

  const session = await mongoose.startSession();
  try {
    let sale;

    await session.withTransaction(async () => {
      const productIds = cart.map((c) => c.productId);
      const products = await Product.find(
        { _id: { $in: productIds }, business: business._id, status: 'ACTIVE' },
        null,
        { session }
      );
      const productMap = new Map(products.map((p) => [p._id.toString(), p]));

      let subtotalMinor = 0;
      const items = [];

      for (const line of cart) {
        const product = productMap.get(line.productId.toString());
        if (!product) {
          throw new AppError('One or more products in the cart could not be found.', 400, 'PRODUCT_NOT_FOUND');
        }
        if (line.quantity <= 0) {
          throw new AppError(`Invalid quantity for ${product.name}.`, 400, 'INVALID_QUANTITY');
        }

        // Price is always taken from the server's product record, never
        // trusted from the client cart payload.
        const unitPriceMinor = product.sellingPriceMinor;
        const discountMinor = Math.max(0, Math.min(line.discountMinor || 0, unitPriceMinor * line.quantity));
        const lineSubtotal = unitPriceMinor * line.quantity - discountMinor;

        items.push({
          product: product._id,
          name: product.name,
          quantity: line.quantity,
          unitPriceMinor,
          discountMinor,
          subtotalMinor: lineSubtotal,
        });
        subtotalMinor += lineSubtotal;
      }

      const totalMinor = subtotalMinor; // tax hook: add business.settings.taxRatePercent here later
      const amountPaidMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);

      if (amountPaidMinor > totalMinor) {
        throw new AppError('Amount paid exceeds the sale total.', 400, 'OVERPAYMENT');
      }

      const balanceMinor = totalMinor - amountPaidMinor;
      const paymentStatus = balanceMinor === 0 ? 'PAID' : (amountPaidMinor === 0 ? 'UNPAID' : 'PARTIAL');

      const seq = await nextSequence(business._id, 'SALE', session);
      const saleNumber = buildSaleNumber(business._id, seq);

      const [createdSale] = await Sale.create(
        [{
          business: business._id,
          branch: branch._id,
          saleNumber,
          cashierMembership: cashierMembership._id,
          customer: customer || undefined,
          items,
          subtotalMinor,
          discountMinor: items.reduce((s, i) => s + i.discountMinor, 0),
          totalMinor,
          payments,
          amountPaidMinor,
          balanceMinor,
          paymentStatus,
          currency: business.currency,
          clientRequestId,
        }],
        { session }
      );

      // Deduct inventory for every line item — each call is itself an
      // atomic conditional update; if any one fails on insufficient stock,
      // the whole transaction (including the Sale doc already created in
      // this same transaction) is rolled back by withTransaction.
      for (const item of items) {
        await adjustInventory({
          business: business._id,
          branch: branch._id,
          product: item.product,
          delta: -item.quantity,
          type: 'SALE',
          reference: saleNumber,
          performedBy: cashierMembership.user,
          session,
          allowNegative: allowNegativeStock,
        });
      }

      await AuditLog.create(
        [{
          business: business._id,
          actor: cashierMembership.user,
          action: 'sale.create',
          entityType: 'Sale',
          entityId: createdSale._id,
          metadata: { saleNumber, totalMinor, paymentStatus },
        }],
        { session }
      );

      sale = createdSale;
    });

    return sale;
  } finally {
    session.endSession();
  }
}

module.exports = { createSale };
