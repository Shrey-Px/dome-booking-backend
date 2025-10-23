const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking creation rate limiter (more restrictive)
const bookingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 booking attempts per 5 minutes
  message: {
    success: false,
    message: 'Too many booking attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment processing rate limiter
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 payment attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many payment attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  bookingLimiter,
  paymentLimiter,
};