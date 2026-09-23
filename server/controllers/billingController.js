const Business = require('../models/Business');
const User = require('../models/User');
const PlatformMessage = require('../models/PlatformMessage');
const Notification = require('../models/Notification');
const crypto = require('crypto');

const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const {
  PLAN_LIMITS,
} = require('../utils/planLimits');

const PLANS = {
  STARTER: {
    ...PLAN_LIMITS.STARTER,
    features: [
      'POS & sales management',
      'Inventory management',
      'Sales history',
      'Receipts & invoices',
      'Business dashboard',
      'Essential sales insights',
    ],
  },

  GROWTH: {
    ...PLAN_LIMITS.GROWTH,
    features: [
      'POS & sales management',
      'Inventory management',
      'Sales history',
      'Receipts & invoices',
      'Business dashboard',
      'Multi-branch management',
      'Staff management',
      'Attendance tracking',
      'Advanced business insights',
    ],
  },

  BUSINESS: {
    ...PLAN_LIMITS.BUSINESS,
    features: [
      'POS & sales management',
      'Inventory management',
      'Sales history',
      'Receipts & invoices',
      'Business dashboard',
      'Multi-branch management',
      'Staff management',
      'Attendance tracking',
      'Advanced business insights',
      'Higher operational capacity',
      'Priority support',
    ],
  },

  SCALE: {
    ...PLAN_LIMITS.SCALE,
    features: [
      'POS & sales management',
      'Inventory management',
      'Sales history',
      'Receipts & invoices',
      'Business dashboard',
      'Multi-location management',
      'Staff management',
      'Attendance tracking',
      'Advanced business insights',
      'Higher operational capacity',
      'Priority onboarding',
      'Priority support',
    ],
  },
};

const get = asyncHandler(async (req, res) => {
  return ok(res, {
    business: req.business,
    plans: PLANS,
    limits:
      PLAN_LIMITS[
        req.business.subscription?.plan
      ] || PLAN_LIMITS.STARTER,
  });
});

const customRequest = asyncHandler(
  async (req, res) => {
    const { message } = req.body || {};

    const admins = await User.find({
      platformRole: {
        $ne: null,
      },
      status: 'ACTIVE',
    })
      .select('_id')
      .lean();

    if (!admins.length) {
      throw new AppError(
        'No platform admin is available right now.',
        503,
        'NO_PLATFORM_ADMIN'
      );
    }

    const subject = `Custom plan request: ${req.business.name}`;

    const body =
      message ||
      `I would like to discuss a custom plan for ${req.business.name}.`;

    await PlatformMessage.insertMany(
      admins.map((admin) => ({
        sender: req.user._id,
        recipient: admin._id,
        subject,
        message: body,
      }))
    );

    await Notification.insertMany(
      admins.map((admin) => ({
        user: admin._id,
        type: 'CUSTOM_PLAN_REQUEST',
        title: subject,
        message: body,
        metadata: {
          businessId: req.business._id,
        },
      }))
    );

    return ok(res, {
      message:
        'Your custom plan request was sent to the platform team.',
    });
  }
);

const initialize = asyncHandler(
  async (req, res) => {
    const { plan } = req.body || {};

    const selected = PLANS[plan];

    if (!selected) {
      throw new AppError(
        'Choose a valid Stocker plan.',
        400,
        'INVALID_PLAN'
      );
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new AppError(
        'Online payments are not configured yet. Contact the platform team.',
        503,
        'PAYMENTS_NOT_CONFIGURED'
      );
    }

    const response = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          email: req.user.email,

          amount:
            selected.amountNaira * 100,

          currency:
            req.business.currency || 'NGN',

          callback_url:
            process.env.PAYSTACK_CALLBACK_URL ||
            `${
              process.env.CLIENT_URL?.split(',')[0] ||
              'http://localhost:5500'
            }/billing.html`,

          metadata: {
            businessId:
              req.business._id.toString(),

            plan,
          },
        }),
      }
    );

    const payload =
      await response.json();

    if (
      !response.ok ||
      !payload.status
    ) {
      throw new AppError(
        'Could not start payment. Please try again.',
        502,
        'PAYMENT_INITIALIZATION_FAILED'
      );
    }

    return ok(res, {
      authorizationUrl:
        payload.data.authorization_url,

      reference:
        payload.data.reference,
    });
  }
);

const verify = asyncHandler(
  async (req, res) => {
    const { reference } =
      req.body || {};

    if (
      !reference ||
      !process.env.PAYSTACK_SECRET_KEY
    ) {
      throw new AppError(
        'A payment reference is required.',
        400,
        'INVALID_PAYMENT_REFERENCE'
      );
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const payload =
      await response.json();

    if (
      !response.ok ||
      !payload.status ||
      payload.data.status !== 'success'
    ) {
      throw new AppError(
        'Payment could not be verified.',
        400,
        'PAYMENT_NOT_VERIFIED'
      );
    }

    const metadata =
      payload.data.metadata || {};

    const plan = PLANS[
      metadata.plan
    ]
      ? metadata.plan
      : null;

    if (
      !plan ||
      metadata.businessId !==
        req.business._id.toString()
    ) {
      throw new AppError(
        'Payment does not match this business.',
        400,
        'PAYMENT_BUSINESS_MISMATCH'
      );
    }

    const business =
      await Business.findById(
        req.business._id
      );

    business.subscription.plan =
      plan;

    business.subscription.status =
      'ACTIVE';

    business.subscription.provider =
      'PAYSTACK';

    business.subscription.lastPaymentReference =
      reference;

    business.subscription.accessEndsAt =
      new Date(
        Date.now() +
          30 *
            24 *
            60 *
            60 *
            1000
      );

    await business.save();

    return ok(res, {
      message:
        'Subscription activated.',
      subscription:
        business.subscription,
    });
  }
);

async function webhook(req, res) {
  const signature =
    req.headers[
      'x-paystack-signature'
    ];

  const expected =
    crypto
      .createHmac(
        'sha512',
        process.env.PAYSTACK_SECRET_KEY ||
          ''
      )
      .update(req.body)
      .digest('hex');

  if (
    !signature ||
    signature !== expected
  ) {
    return res
      .status(401)
      .json({
        success: false,
        message:
          'Invalid signature.',
      });
  }

  const event = JSON.parse(
    req.body.toString('utf8')
  );

  if (
    event.event ===
    'charge.success'
  ) {
    const data =
      event.data || {};

    const metadata =
      data.metadata || {};

    const plan = PLANS[
      metadata.plan
    ]
      ? metadata.plan
      : null;

    if (
      plan &&
      metadata.businessId
    ) {
      await Business.findByIdAndUpdate(
        metadata.businessId,
        {
          $set: {
            'subscription.plan':
              plan,

            'subscription.status':
              'ACTIVE',

            'subscription.provider':
              'PAYSTACK',

            'subscription.lastPaymentReference':
              data.reference,

            'subscription.accessEndsAt':
              new Date(
                Date.now() +
                  30 *
                    24 *
                    60 *
                    60 *
                    1000
              ),
          },
        }
      );
    }
  }

  return res.json({
    success: true,
  });
}

module.exports = {
  get,
  customRequest,
  initialize,
  verify,
  webhook,
};
