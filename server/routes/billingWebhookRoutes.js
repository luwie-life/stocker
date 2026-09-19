const express = require('express');
const controller = require('../controllers/billingController');

const router = express.Router();
router.post('/', express.raw({ type: 'application/json' }), controller.webhook);
module.exports = router;