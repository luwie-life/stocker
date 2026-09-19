const express = require('express');
const authenticate = require('../middleware/authenticate');
const requirePlatformAdmin = require('../middleware/requirePlatformAdmin');
const controller = require('../controllers/platformAdminController');
const router = express.Router();

router.use(authenticate, requirePlatformAdmin());
router.get('/overview', controller.overview);
router.get('/feedback', controller.feedback);
router.patch('/feedback/:id', controller.updateFeedback);
router.post('/invite-super-admin', controller.inviteSuperAdmin);
router.get('/marketing', controller.marketingContent);
router.post('/marketing', controller.saveMarketingContent);
router.get('/users', controller.users);
router.get('/ambassadors', controller.ambassadors);
router.get('/messages', controller.messages);
router.post('/messages', controller.sendMessage);
router.get('/businesses', controller.businesses);
router.patch('/businesses/:id/subscription', requirePlatformAdmin(['SUPER_ADMIN']), controller.updateBusinessSubscription);
router.patch('/users/:id/status', requirePlatformAdmin(['SUPER_ADMIN']), controller.updateUserStatus);
router.patch('/ambassadors/:id', requirePlatformAdmin(['SUPER_ADMIN']), controller.updateAmbassador);

module.exports = router;
