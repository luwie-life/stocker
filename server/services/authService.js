const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const User = require('../models/User');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const TenantMembership = require('../models/TenantMembership');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const { seedDefaultRolesForBusiness } = require('../jobs/seedPermissions');
const Ambassador = require('../models/Ambassador');
const Referral = require('../models/Referral');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/mailer');

const SALT_ROUNDS = 12;

function buildAmbassadorReferralCode(fullName) {
  const base = (fullName || 'STOCKER').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'STOCKER';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}

async function createAmbassadorProfile(userId, ambassadorApplication = {}, referralCodeOverride) {
  const existing = await Ambassador.findOne({ user: userId });
  if (existing) return existing;

  let referralCode = referralCodeOverride || buildAmbassadorReferralCode('Ambassador');
  let attempts = 0;
  while (attempts < 5) {
    const match = await Ambassador.findOne({ referralCode }).lean();
    if (!match) break;
    referralCode = buildAmbassadorReferralCode(`AMB-${Date.now()}`);
    attempts += 1;
  }

  const ambassador = await Ambassador.create({
    user: userId,
    referralCode,
    status: 'PENDING',
    application: {
      phone: ambassadorApplication.phone || '',
      location: ambassadorApplication.location || '',
      experience: ambassadorApplication.experience || '',
      audience: ambassadorApplication.audience || '',
      note: ambassadorApplication.note || '',
    },
  });

  return ambassador;
}

// Registration is one atomic transaction: User + Business + default Roles
// + the Owner's TenantMembership all succeed together or none do.
// Requires a replica-set-enabled MongoDB (Atlas M0+ qualifies by default).
async function registerBusiness({ fullName, email, password, phone, businessName, businessType, referralCode, accountType = 'BUSINESS', ambassadorApplication = {} }) {
  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) {
    throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
  }

  if (accountType === 'AMBASSADOR' && !ambassadorApplication.location) {
    throw new AppError('Please add your location so your ambassador application can be reviewed.', 400, 'AMBASSADOR_LOCATION_REQUIRED');
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      let user;
      try {
        [user] = await User.create([{ email: email.toLowerCase(), passwordHash, fullName, phone }], { session });
      } catch (err) {
        // Race condition guard: two simultaneous registrations with the
        // same email. The pre-check above isn't sufficient on its own.
        if (err.code === 11000) {
          throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
        }
        throw err;
      }

      let business = null;
      let membership = null;
      let branch = null;

      if (accountType === 'BUSINESS') {
        const [newBusiness] = await Business.create(
          [{ name: businessName, type: businessType, subscription: { plan: 'STARTER', status: 'TRIAL', trialStartedAt: new Date(), trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }],
          { session }
        );
        business = newBusiness;

        const roles = await seedDefaultRolesForBusiness(business._id, session);

        const [defaultBranch] = await Branch.create(
          [{ business: business._id, name: 'Main Branch', code: 'MAIN' }],
          { session }
        );
        branch = defaultBranch;

        const [newMembership] = await TenantMembership.create(
          [{ user: user._id, business: business._id, role: roles.OWNER._id, branch: defaultBranch._id, status: 'ACTIVE' }],
          { session }
        );
        membership = newMembership;

        if (referralCode) {
          const ambassador = await Ambassador.findOne({ referralCode: referralCode.toUpperCase(), status: 'ACTIVE' }).session(session);
          if (ambassador && ambassador.user.toString() !== user._id.toString()) {
            await Referral.create([{ ambassador: ambassador._id, business: business._id }], { session });
          }
        }
      } else {
        const ambassador = await createAmbassadorProfile(user._id, ambassadorApplication, referralCode && referralCode.trim());
        result = { user, ambassador, business: null, membership: null, branch: null };
        return;
      }

      result = { user, business, membership, branch };
    });

    const token = signToken(result.user._id);
    return {
      token,
      user: { id: result.user._id, email: result.user.email, fullName: result.user.fullName, platformRole: result.user.platformRole || null },
      business: result.business ? { id: result.business._id, name: result.business.name, type: result.business.type } : null,
    };
  } finally {
    session.endSession();
  }
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }
  if (user.status !== 'ACTIVE') {
    throw new AppError('This account is suspended.', 403, 'ACCOUNT_SUSPENDED');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user._id);
  return {
    token,
    user: { id: user._id, email: user.email, fullName: user.fullName, platformRole: user.platformRole || null },
    isPlatformAdmin: Boolean(user.platformRole),
  };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
  }
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) return;
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const base = process.env.PASSWORD_RESET_URL || `${process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5500'}/reset-password.html`;
  await sendPasswordResetEmail({ to: user.email, name: user.fullName, resetUrl: `${base}?token=${rawToken}` });
}

async function resetPassword(rawToken, newPassword) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } }).select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) throw new AppError('This password reset link is invalid or expired.', 400, 'INVALID_RESET_TOKEN');
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
}

module.exports = { registerBusiness, login, changePassword, requestPasswordReset, resetPassword };
