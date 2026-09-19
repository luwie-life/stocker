const express = require('express');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const requirePermission = require('../middleware/requirePermission');
const { PERMISSIONS } = require('../config/permissions');
const controller = require('../controllers/billingController');

const router = express.Router();
router.use(authenticate, (req, res, next) => { req.allowExpiredSubscription = true; next(); }, resolveTenant);
router.get('/', requirePermission(PERMISSIONS.BILLING_VIEW), controller.get);
router.post('/custom-request', requirePermission(PERMISSIONS.BILLING_MANAGE), controller.customRequest);
router.post('/initialize', requirePermission(PERMISSIONS.BILLING_MANAGE), controller.initialize);
router.post('/verify', requirePermission(PERMISSIONS.BILLING_MANAGE), controller.verify);
module.exports = router;