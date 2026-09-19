// One-off / re-runnable helper: seed default roles+permissions for a
// business. Called at registration time (see authService.registerBusiness).
const Role = require('../models/Role');
const { DEFAULT_ROLE_PERMISSIONS } = require('../config/permissions');

async function seedDefaultRolesForBusiness(businessId, session) {
  const roleDocs = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([name, permissions]) => ({
    business: businessId,
    name,
    permissions,
    isSystemDefault: true,
  }));

  const created = await Role.insertMany(roleDocs, { session });
  const byName = {};
  for (const r of created) byName[r.name] = r;
  return byName;
}

module.exports = { seedDefaultRolesForBusiness };
