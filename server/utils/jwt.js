const jwt = require('jsonwebtoken');

function signToken(userId) {
  // Minimal identity in the token — no business/role data baked in, since
  // that can change (role edits, staff deactivation) without the token
  // being reissued. Tenant context is always resolved fresh server-side.
  return jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
