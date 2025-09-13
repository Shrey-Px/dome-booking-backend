const { Booking, Facility } = require('../models');
const logger = require('../utils/logger');

const bookingController = {
  // Get all bookings
  getAllBookings: async (req, res) => {
    try {
      console.log('📋 Getting all bookings...');
      const bookings = await Booking.findAll({
        include: [{ model: Facility }],
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        data: bookings,
        count: bookings.length
      });
    } catch (error) {
      console.error('❌ Error getting bookings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bookings',
        error: error.message
      });
    }
  },

  // Get single booking
  getBooking: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`📋 Getting booking ${id}...`);
      
      const booking = await Booking.findByPk(id, {
        include: [{ model: Facility }]
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      console.error('❌ Error getting booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve booking',
        error: error.message
      });
    }
  },

  // Create new booking
  createBooking: async (req, res) => {
    try {
      console.log('✨ Creating new booking...');
      console.log('Request body:', req.body);

      const {
        facilityId,
        customerName,
        customerEmail,
        customerPhone,
        userId,
        courtNumber,
        bookingDate,
        startTime,
        endTime,
        duration,
        totalAmount,
        discountCode,
        discountAmount,
        source = 'web',
        notes
      } = req.body;

      // Basic validation
      if (!facilityId || !customerName || !customerEmail || !courtNumber || !bookingDate || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          required: ['facilityId', 'customerName', 'customerEmail', 'courtNumber', 'bookingDate', 'startTime', 'endTime']
        });
      }

      // Check if facility exists
      const facility = await Facility.findByPk(facilityId);
      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found'
        });
      }

      // Check for time conflicts (simplified)
      const existingBooking = await Booking.findOne({
        where: {
          facilityId,
          courtNumber,
          bookingDate,
          startTime,
          status: ['pending', 'paid']
        }
      });

      if (existingBooking) {
        return res.status(409).json({
          success: false,
          message: 'Time slot already booked'
        });
      }

      // Create booking
      const booking = await Booking.create({
        facilityId,
        customerName,
        customerEmail,
        customerPhone,
        userId,
        courtNumber,
        bookingDate,
        startTime,
        endTime,
        duration: duration || 60,
        totalAmount,
        discountCode,
        discountAmount: discountAmount || 0,
        source,
        notes,
        status: 'pending'
      });

      console.log('✅ Booking created successfully:', booking.id);

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking
      });

    } catch (error) {
      console.error('❌ Error creating booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message
      });
    }
  },

  // Cancel booking
  cancelBooking: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`❌ Cancelling booking ${id}...`);

      const booking = await Booking.findByPk(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      await booking.update({ status: 'cancelled' });

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: booking
      });

    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  }
};

module.exports = bookingController;