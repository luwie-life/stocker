const PLAN_LIMITS = {
  STARTER: {
    name: 'Starter',
    amountNaira: 5000,
    branches: 1,
    products: 500,
    staff: 3,
  },

  GROWTH: {
    name: 'Growth',
    amountNaira: 10000,
    branches: 2,
    products: 2000,
    staff: 10,
  },

  BUSINESS: {
    name: 'Business',
    amountNaira: 15000,
    branches: 5,
    products: 10000,
    staff: 25,
  },

  SCALE: {
    name: 'Scale',
    amountNaira: 20000,
    branches: 10,
    products: 25000,
    staff: 50,
  },

  CUSTOM: {
    name: 'Custom',
    amountNaira: null,
    branches: Infinity,
    products: Infinity,
    staff: Infinity,
  },
};

function getPlanLimits(business) {
  return (
    PLAN_LIMITS[business.subscription?.plan] ||
    PLAN_LIMITS.STARTER
  );
}

module.exports = {
  PLAN_LIMITS,
  getPlanLimits,
};
