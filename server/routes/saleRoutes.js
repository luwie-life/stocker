const express = require('express');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const requirePermission = require('../middleware/requirePermission');
const { PERMISSIONS } = require('../config/permissions');
const saleController = require('../controllers/saleController');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/', requirePermission(PERMISSIONS.SALES_VIEW), saleController.list);
router.get('/:id', requirePermission(PERMISSIONS.SALES_VIEW), saleController.getOne);
router.post('/', requirePermission(PERMISSIONS.SALES_CREATE), saleController.create);
router.post('/:id/refund', requirePermission(PERMISSIONS.SALES_REFUND), saleController.refund);

module.exports = router;
