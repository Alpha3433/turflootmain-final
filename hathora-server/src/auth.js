const jwt = require('jsonwebtoken');

// JWT secret key - matches the one used for token generation in your API
// This should match the secret used in your Hathora SDK integration
const JWT_SECRET = process.env.JWT_SECRET || 'hathora-turfloot-secret';

/**
 * Validate JWT token from query parameter
 * @param {string} token - JWT token to validate
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
function validateToken(token) {
  if (!token) {
    console.log('❌ No token provided');
    return null;
  }

  try {
    // Verify the token - this should match the Hathora anonymous tokens
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token validated for user:', decoded.name || decoded.id);
    return decoded;
  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return null;
  }
}

/**
 * Extract user info from validated token
 * @param {Object} decodedToken - Decoded JWT token
 * @returns {Object} - User information object
 */
function getUserInfo(decodedToken) {
  return {
    id: decodedToken.id || decodedToken.sub || 'anonymous',
    name: decodedToken.name || decodedToken.username || 'Player',
    type: decodedToken.type || 'player'
  };
}

module.exports = { validateToken, getUserInfo };