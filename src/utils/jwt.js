const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const jwtUtils = {
  /**
   * Generate JWT token
   */
  generateToken: (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'dome-booking-api'
    });
  },

  /**
   * Verify JWT token
   */
  verifyToken: (token) => {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'dome-booking-api'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  },

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken: (token) => {
    return jwt.decode(token);
  }
};

module.exports = jwtUtils;