// Structured, consistent response shapes. Never leak raw stack traces or
// internal error objects to the client.
function ok(res, data, meta) {
  return res.status(200).json({ success: true, data, ...(meta ? { meta } : {}) });
}

function created(res, data) {
  return res.status(201).json({ success: true, data });
}

function fail(res, statusCode, message, code) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(code ? { code } : {}),
  });
}

module.exports = { ok, created, fail };
