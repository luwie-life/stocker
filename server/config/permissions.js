// Centralized permission keys. Controllers/routes check against these
// strings via the requirePermission middleware — never rely on the
// frontend hiding a button as security.
const PERMISSIONS = {
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',

  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_REFUND: 'sales.refund',

  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',

  BRANCHES_VIEW: 'branches.view',
  BRANCHES_MANAGE: 'branches.manage',

  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_MANAGE: 'attendance.manage',

  ANALYTICS_VIEW: 'analytics.view',

  SETTINGS_MANAGE: 'settings.manage',

  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
};

const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS);

// Default permission sets per role. Businesses can customize a Role's
// `permissions` array later without this map changing (see Role model —
// isSystemDefault flips to false once customized).
const DEFAULT_ROLE_PERMISSIONS = {
  OWNER: ALL_PERMISSION_KEYS,

  ADMIN: ALL_PERMISSION_KEYS.filter((p) => p !== PERMISSIONS.BILLING_MANAGE),

  MANAGER: [
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_ADJUST, PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_REFUND,
    PERMISSIONS.STAFF_VIEW, PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],

  STOREKEEPER: [
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_ADJUST, PERMISSIONS.INVENTORY_TRANSFER,
  ],

  ACCOUNTANT: [
    PERMISSIONS.SALES_VIEW, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.BILLING_VIEW,
  ],

  CASHIER: [
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_CREATE,
    PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_MANAGE,
  ],

  SALES_STAFF: [
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_CREATE,
  ],
};

// Fail loudly on a typo'd key rather than silently seeding a role that
// looks fully granted but is missing a permission.
for (const [roleName, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
  for (const perm of perms) {
    if (!ALL_PERMISSION_KEYS.includes(perm)) {
      throw new Error(`Unknown permission key "${perm}" in default role "${roleName}"`);
    }
  }
}

module.exports = { PERMISSIONS, ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS };
