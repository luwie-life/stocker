const express = require('express');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const requirePermission = require('../middleware/requirePermission');
const { PERMISSIONS } = require('../config/permissions');
const branchController = require('../controllers/branchController');

const router = express.Router();
router.use(authenticate, resolveTenant);

router.get('/', requirePermission(PERMISSIONS.BRANCHES_VIEW), branchController.list);
router.post('/', requirePermission(PERMISSIONS.BRANCHES_MANAGE), branchController.create);
router.patch('/:id', requirePermission(PERMISSIONS.BRANCHES_MANAGE), branchController.update);

module.exports = router;
