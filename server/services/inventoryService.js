const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');
const AppError = require('../utils/AppError');

// Concurrency-safe stock adjustment. Uses an atomic conditional update
// (findOneAndUpdate with a quantity guard in the filter) instead of
// read-then-subtract-then-save, so two simultaneous sales can never both
// succeed against stock that only covers one of them.
//
// `delta` is signed: positive to add stock, negative to remove it.
// Pass a mongoose session to run inside a transaction (required for sales).
async function adjustInventory({ business, branch, product, delta, type, reference, reason, performedBy, clientRequestId, session, allowNegative = false }) {
  let updated;

  if (delta >= 0 || allowNegative) {
    // Safe to upsert: adding stock (or negative allowed) can never violate
    // the non-negative guard, so a single atomic upsert+$inc is race-free.
    updated = await Inventory.findOneAndUpdate(
      { business, branch, product },
      { $inc: { quantity: delta }, $setOnInsert: {} },
      { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );
  } else {
    // Removing stock without allowing negative: the row must already exist
    // AND have enough quantity. No upsert here — upsert can't express a
    // "quantity >= N" precondition on a document that doesn't exist yet,
    // so we require an existing doc and guard atomically against it.
    updated = await Inventory.findOneAndUpdate(
      { business, branch, product, quantity: { $gte: -delta } },
      { $inc: { quantity: delta } },
      { new: true, session }
    );
  }

  if (!updated) {
    throw new AppError('Insufficient stock for one or more items.', 409, 'INSUFFICIENT_STOCK');
  }

  const previousQuantity = updated.quantity - delta;

  await InventoryMovement.create(
    [{
      business, branch, product, type,
      quantityChange: delta,
      previousQuantity,
      newQuantity: updated.quantity,
      reference, reason, performedBy, clientRequestId,
    }],
    { session }
  );

  return updated;
}

module.exports = { adjustInventory };
