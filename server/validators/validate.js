const AppError = require('../utils/AppError');

// Wraps a Zod schema as Express middleware. Validation errors become a
// clean 400 — never a raw stack trace.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return next(new AppError(message || 'Invalid input.', 400, 'VALIDATION_ERROR'));
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
