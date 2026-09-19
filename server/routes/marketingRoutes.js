const express = require('express');
const MarketingContent = require('../models/MarketingContent');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/tutorials', asyncHandler(async (req, res) => {
  const tutorials = await MarketingContent.find({ isActive: true, type: 'VIDEO' }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: tutorials });
}));

module.exports = router;