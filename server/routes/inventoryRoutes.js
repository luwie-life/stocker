const express = require('express');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const requirePermission = require('../middleware/requirePermission');
const { PERMISSIONS } = require('../config/permissions');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/branch/:branchId', requirePermission(PERMISSIONS.INVENTORY_VIEW), inventoryController.listForBranch);
router.get('/low-stock', requirePermission(PERMISSIONS.INVENTORY_VIEW), inventoryController.lowStock);
router.get('/movements', requirePermission(PERMISSIONS.INVENTORY_VIEW), inventoryController.movements);
router.post('/adjust', requirePermission(PERMISSIONS.INVENTORY_ADJUST), inventoryController.adjust);

module.exports = router;
