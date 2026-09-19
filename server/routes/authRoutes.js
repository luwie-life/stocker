const express = require('express');
const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const validate = require('../validators/validate');
const { registerSchema, loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validators/authValidators');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.requestPasswordReset);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/session', authenticate, authController.session);
router.get('/me', authenticate, resolveTenant, authController.me);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
