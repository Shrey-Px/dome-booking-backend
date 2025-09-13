const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// Debug middleware
router.use((req, res, next) => {
  console.log(`🎯 Booking route hit: ${req.method} ${req.path}`);
  next();
});

// Routes
router.get('/', bookingController.getAllBookings);
router.get('/:id', bookingController.getBooking);
router.post('/create-booking', bookingController.createBooking);
router.patch('/:id/cancel', bookingController.cancelBooking);

module.exports = router;