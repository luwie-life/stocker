const PLAN_LIMITS = {
  STARTER: { branches: 1, products: 500, staff: 3 },
  GROWTH: { branches: 5, products: 5000, staff: 25 },
  CUSTOM: { branches: Infinity, products: Infinity, staff: Infinity },
};

function getPlanLimits(business) {
  return PLAN_LIMITS[business.subscription?.plan] || PLAN_LIMITS.STARTER;
}

module.exports = { PLAN_LIMITS, getPlanLimits };