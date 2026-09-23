const express = require('express');
const multer = require('multer');

const authenticate = require('../middleware/authenticate');
const resolveTenant = require('../middleware/resolveTenant');
const requirePermission = require('../middleware/requirePermission');
const { PERMISSIONS } = require('../config/permissions');

const productController = require('../controllers/productController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(
  authenticate,
  resolveTenant
);

router.get(
  '/',
  requirePermission(
    PERMISSIONS.PRODUCTS_VIEW
  ),
  productController.list
);

router.get(
  '/import/template',
  requirePermission(
    PERMISSIONS.PRODUCTS_CREATE
  ),
  productController.template
);

router.post(
  '/import/preview',
  requirePermission(
    PERMISSIONS.PRODUCTS_CREATE
  ),
  upload.single('file'),
  productController.previewImport
);

router.post(
  '/import/confirm',
  requirePermission(
    PERMISSIONS.PRODUCTS_CREATE
  ),
  productController.confirmImport
);

router.get(
  '/barcode/:barcode',
  requirePermission(
    PERMISSIONS.PRODUCTS_VIEW
  ),
  productController.findByBarcode
);

router.post(
  '/',
  requirePermission(
    PERMISSIONS.PRODUCTS_CREATE
  ),
  productController.create
);

router.patch(
  '/:id',
  requirePermission(
    PERMISSIONS.PRODUCTS_UPDATE
  ),
  productController.update
);

router.delete(
  '/:id',
  requirePermission(
    PERMISSIONS.PRODUCTS_DELETE
  ),
  productController.remove
);

module.exports = router;
