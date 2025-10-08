const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const vendorAuth = require('../middleware/vendorAuth');
const vendorAuthController = require('../controllers/mongodb/vendorAuthController');
const vendorBookingsController = require('../controllers/mongodb/vendorBookingsController');

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
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

// Public routes (no auth required)
router.post('/login', loginLimiter, vendorAuthController.login);

// Protected routes (auth required)
router.get('/profile', vendorAuth, vendorAuthController.getProfile);
router.post('/logout', vendorAuth, vendorAuthController.logout);

// Bookings routes
router.get('/bookings', vendorAuth, vendorBookingsController.getBookings);
router.get('/bookings/:bookingId', vendorAuth, vendorBookingsController.getBookingDetails);
router.get('/stats', vendorAuth, vendorBookingsController.getStats);

// Cancel booking
router.put('/bookings/:bookingId/cancel', vendorAuth, vendorBookingsController.cancelBooking);

// Create manual booking
router.post('/bookings', vendorAuth, vendorBookingsController.createBooking);

module.exports = router;