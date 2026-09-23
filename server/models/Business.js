const mongoose = require('mongoose');

const TRIAL_DAYS = 7;

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        'RETAIL',
        'SUPERMARKET',
        'PHARMACY',
        'WHOLESALE',
        'DISTRIBUTION',
        'OTHER',
      ],
      required: true,
    },

    country: {
      type: String,
      default: 'NG',
    },

    currency: {
      type: String,
      default: 'NGN',
    },

    timezone: {
      type: String,
      default: 'Africa/Lagos',
    },

    settings: {
      negativeStockAllowed: {
        type: Boolean,
        default: false,
      },

      staffSalesTrackingMode: {
        type: String,
        enum: [
          'INDIVIDUAL',
          'TILL',
          'BRANCH_ONLY',
        ],
        default: 'INDIVIDUAL',
      },

      taxRatePercent: {
        type: Number,
        default: 0,
      },
    },

    receiptBranding: {
      logoUrl: String,
      address: String,
      phone: String,
      email: String,
      footerNote: String,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },

    subscription: {
      plan: {
        type: String,
        enum: [
          'STARTER',
          'GROWTH',
          'BUSINESS',
          'SCALE',
          'CUSTOM',
        ],
        default: 'STARTER',
      },

      status: {
        type: String,
        enum: [
          'TRIAL',
          'ACTIVE',
          'PAUSED',
        ],
        default: 'TRIAL',
      },

      trialStartedAt: {
        type: Date,
        default: Date.now,
      },

      trialEndsAt: {
        type: Date,
        default: () =>
          new Date(
            Date.now() +
              TRIAL_DAYS *
                24 *
                60 *
                60 *
                1000
          ),
      },

      accessEndsAt: Date,

      provider: {
        type: String,
        enum: ['PAYSTACK', 'MANUAL'],
        default: 'MANUAL',
      },

      lastPaymentReference: String,

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Business',
  businessSchema
);
