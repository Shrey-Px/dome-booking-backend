const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const vendorAuth = require('../middleware/vendorAuth');
const vendorAuthController = require('../controllers/mongodb/vendorAuthController');
const vendorBookingsController = require('../controllers/mongodb/vendorBookingsController');

// Rate limiter ONLY for login endpoint - more generous limits
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10 attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.'
    });
  }
});

// Authentication routes
router.post('/login', loginLimiter, vendorAuthController.login); // Only login has rate limiting
router.post('/logout', vendorAuth, vendorAuthController.logout);
router.get('/profile', vendorAuth, vendorAuthController.getProfile);

// Booking routes - NO RATE LIMITING (protected by JWT auth instead)
router.get('/bookings', vendorAuth, vendorBookingsController.getBookings);
router.get('/bookings/:bookingId', vendorAuth, vendorBookingsController.getBookingDetails);
router.post('/bookings', vendorAuth, vendorBookingsController.createBooking);
router.put('/bookings/:bookingId/cancel', vendorAuth, vendorBookingsController.cancelBooking);

// Stats route - NO RATE LIMITING
router.get('/stats', vendorAuth, vendorBookingsController.getStats);

module.exports = router;