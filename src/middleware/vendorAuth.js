const jwtUtils = require('../utils/jwt');
const Vendor = require('../models/mongodb/Vendor');

const vendorAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = jwtUtils.verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired token'
      });
    }

    // Get vendor from database
    const vendor = await Vendor.findById(decoded.vendorId);

    if (!vendor) {
      return res.status(401).json({
        success: false,
        message: 'Vendor account not found'
      });
    }

    if (!vendor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account is deactivated'
      });
    }

    // Attach vendor to request
    req.vendor = {
      id: vendor._id,
      email: vendor.email,
      name: vendor.name,
      facilitySlug: vendor.facilitySlug,
      facilityId: vendor.facilityId,
      role: vendor.role
    };

    next();
  } catch (error) {
    console.error('Vendor auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

module.exports = vendorAuth;