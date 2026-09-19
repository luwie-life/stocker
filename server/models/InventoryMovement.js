const mongoose = require('mongoose');

// Append-only. This is the source of truth for every stock change —
// Inventory.quantity is a derived cache of the sum of these.
const inventoryMovementSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: {
    type: String,
    enum: [
      'PURCHASE', 'OPENING_STOCK', 'SALE', 'RETURN', 'DAMAGE',
      'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'MANUAL_ADD', 'MANUAL_REMOVE',
    ],
    required: true,
  },
  quantityChange: { type: Number, required: true },
  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  reference: { type: String },
  reason: { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientRequestId: { type: String, trim: true },
}, { timestamps: true });

inventoryMovementSchema.index({ business: 1, product: 1, branch: 1, createdAt: -1 });
inventoryMovementSchema.index({ business: 1, clientRequestId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
