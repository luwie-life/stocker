// Thrown deliberately by services/controllers to signal an expected,
// user-facing error (bad input, insufficient stock, permission denied).
// Caught by the central error handler and turned into a clean JSON
// response — distinct from unexpected bugs, which get logged with detail
// server-side but never exposed to the client.
class AppError extends Error {
  constructor(message, statusCode = 400, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

module.exports = AppError;
