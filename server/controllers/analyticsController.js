const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');

// Every number here is derived live from the database. No placeholders,
// no fabricated metrics — if there's no data yet, the values are honestly 0.
const summary = asyncHandler(async (req, res) => {
  const businessId = req.business._id;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [todayAgg, monthAgg, lowStockCount, recentSales] = await Promise.all([
    Sale.aggregate([
      { $match: { business: businessId, createdAt: { $gte: startOfDay }, status: { $ne: 'VOID' } } },
      { $group: { _id: null, total: { $sum: '$totalMinor' }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: { business: businessId, createdAt: { $gte: startOfMonth }, status: { $ne: 'VOID' } } },
      { $group: { _id: null, total: { $sum: '$totalMinor' }, count: { $sum: 1 } } },
    ]),
    Inventory.aggregate([
      { $match: { business: businessId } },
      { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $match: { $expr: { $lte: ['$quantity', '$product.minimumStock'] } } },
      { $count: 'count' },
    ]),
    Sale.find({ business: businessId }).sort({ createdAt: -1 }).limit(5),
  ]);

  return ok(res, {
    todaySalesMinor: todayAgg[0]?.total || 0,
    todayTransactionCount: todayAgg[0]?.count || 0,
    monthSalesMinor: monthAgg[0]?.total || 0,
    monthTransactionCount: monthAgg[0]?.count || 0,
    lowStockCount: lowStockCount[0]?.count || 0,
    recentSales,
  });
});

module.exports = { summary };
