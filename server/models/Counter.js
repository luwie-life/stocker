const mongoose = require('mongoose');

// Backs tenant-safe, collision-proof sequential numbering (sale numbers,
// receipt numbers, invoice numbers) via atomic $inc — never derived from
// a timestamp alone.
const counterSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  key: { type: String, required: true }, // e.g. 'SALE', 'INVOICE', 'REFUND'
  seq: { type: Number, required: true, default: 0 },
});

counterSchema.index({ business: 1, key: 1 }, { unique: true });

async function nextSequence(business, key, session) {
  const doc = await mongoose.model('Counter').findOneAndUpdate(
    { business, key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return doc.seq;
}

module.exports = { Counter: mongoose.model('Counter', counterSchema), nextSequence };
