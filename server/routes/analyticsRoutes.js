const express = require('express');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const requirePermission = require('../middleware/requirePermission');
const { PERMISSIONS } = require('../config/permissions');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();
router.use(authenticate, resolveTenant);
router.get('/summary', requirePermission(PERMISSIONS.ANALYTICS_VIEW), analyticsController.summary);

module.exports = router;
