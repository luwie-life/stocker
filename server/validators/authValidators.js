const { z } = require('zod');

const registerSchema = z.object({
  accountType: z.enum(['BUSINESS', 'AMBASSADOR']).default('BUSINESS'),
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(30).optional(),
  businessName: z.string().trim().min(2).max(150).optional(),
  businessType: z.enum(['RETAIL', 'SUPERMARKET', 'PHARMACY', 'WHOLESALE', 'DISTRIBUTION', 'OTHER']).optional(),
  referralCode: z.string().trim().max(40).optional(),
  ambassadorApplication: z.object({
    phone: z.string().trim().max(30).optional(),
    location: z.string().trim().max(100).optional(),
    experience: z.string().trim().max(1000).optional(),
    audience: z.string().trim().max(1000).optional(),
    note: z.string().trim().max(2000).optional(),
  }).optional(),
}).superRefine((value, context) => {
  if (value.accountType === 'BUSINESS' && !value.businessName) context.addIssue({ code: z.ZodIssueCode.custom, path: ['businessName'], message: 'Business name is required.' });
  if (value.accountType === 'BUSINESS' && !value.businessType) context.addIssue({ code: z.ZodIssueCode.custom, path: ['businessType'], message: 'Business type is required.' });
  if (value.accountType === 'AMBASSADOR' && !value.ambassadorApplication?.location) context.addIssue({ code: z.ZodIssueCode.custom, path: ['ambassadorApplication', 'location'], message: 'Location is required for ambassador applications.' });
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const forgotPasswordSchema = z.object({ email: z.string().trim().email() });
const resetPasswordSchema = z.object({ token: z.string().min(40), password: z.string().min(8).max(128) });

module.exports = { registerSchema, loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema };
