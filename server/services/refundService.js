const mongoose = require('mongoose');

const Sale = require('../models/Sale');
const Refund = require('../models/Refund');
const AuditLog = require('../models/AuditLog');
const { nextSequence } = require('../models/Counter');
const { adjustInventory } = require('./inventoryService');
const AppError = require('../utils/AppError');

function buildRefundNumber(seq) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `RFD-${date}-${String(seq).padStart(4, '0')}`;
}

// Refund rules enforced here, not trusted from the frontend:
// - must reference the original sale
// - cannot refund more than was sold, minus what's already been refunded,
//   per line item
// - cannot exceed the sale's refundable amount
// - inventory is restored via a RETURN movement
// - an audit log entry is always created
async function createRefund({ business, branch, saleId, items, reason, performedBy }) {
  const session = await mongoose.startSession();
  try {
    let refund;

    await session.withTransaction(async () => {
      const sale = await Sale.findOne({ _id: saleId, business: business._id }, null, { session });
      if (!sale) {
        throw new AppError('Sale not found.', 404, 'SALE_NOT_FOUND');
      }
      if (sale.status === 'VOID') {
        throw new AppError('Cannot refund a voided sale.', 400, 'SALE_VOID');
      }

      let refundTotalMinor = 0;
      const refundItems = [];

      for (const line of items) {
        const saleItem = sale.items.id(line.saleItemId);
        if (!saleItem) {
          throw new AppError('Refund line item does not match the original sale.', 400, 'ITEM_MISMATCH');
        }

        const alreadyRefunded = saleItem.refundedQuantity || 0;
        const refundableQty = saleItem.quantity - alreadyRefunded;
        if (line.quantity > refundableQty) {
          throw new AppError(
            `Cannot refund more than the remaining refundable quantity for ${saleItem.name}.`,
            400,
            'EXCEEDS_REFUNDABLE_QUANTITY'
          );
        }

        const unitRefundAmount = Math.round((saleItem.subtotalMinor / saleItem.quantity) * line.quantity);
        refundTotalMinor += unitRefundAmount;

        saleItem.refundedQuantity = alreadyRefunded + line.quantity;
        refundItems.push({ product: saleItem.product, quantity: line.quantity, amountMinor: unitRefundAmount });
      }

      const refundableAmount = sale.totalMinor - sale.refundedAmountMinor;
      if (refundTotalMinor > refundableAmount) {
        throw new AppError('Refund amount exceeds what remains refundable on this sale.', 400, 'EXCEEDS_REFUNDABLE_AMOUNT');
      }

      sale.refundedAmountMinor += refundTotalMinor;
      sale.status = sale.refundedAmountMinor >= sale.totalMinor ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      await sale.save({ session });

      const seq = await nextSequence(business._id, 'REFUND', session);
      const refundNumber = buildRefundNumber(seq);

      [refund] = await Refund.create(
        [{
          business: business._id,
          branch: branch._id,
          sale: sale._id,
          refundNumber,
          items: refundItems,
          totalAmountMinor: refundTotalMinor,
          reason,
          performedBy,
        }],
        { session }
      );

      for (const item of refundItems) {
        await adjustInventory({
          business: business._id,
          branch: branch._id,
          product: item.product,
          delta: item.quantity, // restore stock
          type: 'RETURN',
          reference: refundNumber,
          performedBy,
          session,
          allowNegative: true, // restoring stock never needs the guard
        });
      }

      await AuditLog.create(
        [{
          business: business._id,
          actor: performedBy,
          action: 'refund.create',
          entityType: 'Refund',
          entityId: refund._id,
          metadata: { refundNumber, saleId: sale._id, totalAmountMinor: refundTotalMinor },
        }],
        { session }
      );
    });

    return refund;
  } finally {
    session.endSession();
  }
}

module.exports = { createRefund };
