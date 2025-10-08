const Vendor = require('../../models/mongodb/Vendor');
const jwtUtils = require('../../utils/jwt');
const logger = require('../../utils/logger');

const vendorAuthController = {
  /**
   * Vendor login
   */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find vendor by email
      const vendor = await Vendor.findOne({ email: email.toLowerCase() });

      if (!vendor) {
        logger.warn('Login attempt with non-existent email', { email });
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if account is locked
      if (vendor.isLocked()) {
        const lockTime = Math.ceil((vendor.lockUntil - Date.now()) / 60000);
        logger.warn('Login attempt on locked account', { 
          email, 
          lockTimeRemaining: lockTime 
        });
        
        return res.status(423).json({
          success: false,
          message: `Account is locked due to multiple failed login attempts. Try again in ${lockTime} minutes.`
        });
      }

      // Check if account is active
      if (!vendor.isActive) {
        logger.warn('Login attempt on deactivated account', { email });
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      // Verify password
      const isPasswordValid = await vendor.comparePassword(password);

      if (!isPasswordValid) {
        // Increment failed login attempts
        await vendor.incLoginAttempts();
        
        logger.warn('Failed login attempt', { 
          email, 
          attempts: vendor.loginAttempts + 1 
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Reset login attempts on successful login
      await vendor.resetLoginAttempts();

      // Generate JWT token
      const token = jwtUtils.generateToken({
        vendorId: vendor._id,
        email: vendor.email,
        facilitySlug: vendor.facilitySlug,
        role: vendor.role
      });

      logger.info('Vendor logged in successfully', { 
        vendorId: vendor._id, 
        email: vendor.email,
        facilitySlug: vendor.facilitySlug
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          vendor: {
            id: vendor._id,
            email: vendor.email,
            name: vendor.name,
            facilitySlug: vendor.facilitySlug,
            role: vendor.role
          }
        }
      });

    } catch (error) {
      console.error('Vendor login error:', error);
      logger.error('Vendor login error', { error: error.message });
      
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get current vendor profile
   */
  getProfile: async (req, res) => {
    try {
      const vendor = await Vendor.findById(req.vendor.id).select('-password');

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.json({
        success: true,
        data: vendor
      });

    } catch (error) {
      console.error('Get vendor profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  },

  /**
   * Logout (client-side token removal, but we log it)
   */
  logout: async (req, res) => {
    try {
      logger.info('Vendor logged out', { 
        vendorId: req.vendor.id,
        email: req.vendor.email
      });

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Vendor logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }
};

module.exports = vendorAuthController;