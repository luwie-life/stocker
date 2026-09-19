const AppError = require('../utils/AppError');

// Central error handler. Never leak raw stack traces, Mongo error internals,
// or config to the client — log detail server-side, respond with a clean
// structured message.
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
  }

  if (err.code === 11000) {
    // Mongo duplicate key
    return res.status(409).json({
      success: false,
      message: 'A record with these details already exists.',
      code: 'DUPLICATE',
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid input.',
      code: 'VALIDATION_ERROR',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  console.error('[unhandled-error]', err);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on our end. Please try again.',
    code: 'INTERNAL_ERROR',
  });
}

module.exports = errorHandler;
