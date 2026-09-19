const mongoose = require('mongoose');

// Cached current-quantity view per product+branch. Quantity is only ever
// mutated via findOneAndUpdate with $inc inside a movement-creating
// transaction (see services/inventoryService.js) — never read-modify-write.
const inventorySchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 0 },
}, { timestamps: true });

inventorySchema.index({ business: 1, branch: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
