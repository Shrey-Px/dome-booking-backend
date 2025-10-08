const { ObjectId } = require('mongodb');
const logger = require('../../utils/logger');

const vendorBookingsController = {
  /**
   * Get all bookings for vendor's facility
   */
  getBookings: async (req, res) => {
    try {
      const { facilityId } = req.vendor;
      const { 
        date, 
        startDate, 
        endDate, 
        status,
        limit = 100,
        skip = 0 
      } = req.query;

      const db = require('mongoose').connection.db;

      // Get the Facility to find its venueId
      const Facility = require('../../models/mongodb/Facility');
      const facility = await Facility.findById(facilityId);
    
      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found'
        });
      }

      // Convert venueId to ObjectId for proper comparison
      const { ObjectId } = require('mongodb');
      const venueObjectId = new ObjectId(facility.venueId.toString());

      // console.log('Searching for bookings with venueId:', venueObjectId);
      
      // Build query using ObjectId
      const query = {
        venue: venueObjectId  // Use ObjectId, not string
      };

      // Date filtering
      if (date) {
        // console.log('Filtering by date:', date);

        // Include venue in EACH condition of the $or
        query.$or = [
          { venue: venueObjectId, bookingDateString: date },
          { venue: venueObjectId, bookingDate: date }
        ];
      
        // Remove the standalone venue from query since it's now in $or
        delete query.venue;
      }

      // console.log('Final MongoDB query:', JSON.stringify(query, null, 2));

      // Fetch bookings with customer data
      const bookings = await db.collection('Booking')
        .find(query)
        .sort({ startTime: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .toArray();

      // console.log('Raw bookings found:', bookings.length);
      // if (bookings.length > 0) {
        // console.log('First booking sample:', {
        //  venue: bookings[0].venue,
        //  startTime: bookings[0].startTime,
        //  bookingDate: bookings[0].bookingDate,
        //  bookingStatus: bookings[0].bookingStatus
        // });
      //}

      // Get total count
      const totalCount = await db.collection('Booking').countDocuments(query);

      // Format response with customer info
      const formattedBookings = bookings.map(booking => ({
        _id: booking._id,
        // Court info
        courtName: booking.fieldName || `Court ${booking.courtNumber}`,
        courtNumber: booking.courtNumber,
        
        // Date/Time info
        bookingDate: booking.bookingDateString || booking.bookingDate,
        startTime: booking.startTimeString || booking.startTime,
        endTime: booking.endTimeString || booking.endTime,
        duration: booking.duration,
        
        // Customer info - THIS IS WHAT VENDORS NEED
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        
        // Payment info
        totalPrice: booking.totalPrice?.$numberDecimal || booking.totalPrice,
        paymentStatus: booking.paymentIntentStatus || booking.status,
        
        // Booking status
        bookingStatus: booking.bookingStatus || booking.status,
        
        // Timestamps
        createdAt: booking.createdAt,
        cancelledAt: booking.cancelledAt,
        
        // Source
        source: booking.source || 'mobile'
      }));

      logger.info('Vendor bookings fetched', {
        vendorId: req.vendor.id,
        facilitySlug: req.vendor.facilitySlug,
        bookingsCount: formattedBookings.length,
        totalCount
      });

      res.json({
        success: true,
        data: {
          bookings: formattedBookings,
          totalCount,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: (parseInt(skip) + formattedBookings.length) < totalCount
        }
      });

    } catch (error) {
      console.error('Get vendor bookings error:', error);
      logger.error('Get vendor bookings error', {
        vendorId: req.vendor.id,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings',
        error: error.message
      });
    }
  },

  /**
   * Get single booking details
   */
  getBookingDetails: async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { facilityId } = req.vendor;
      const { ObjectId } = require('mongodb');
      
      const db = require('mongoose').connection.db;

      // Get the Facility to find its venueId
      const Facility = require('../../models/mongodb/Facility');
      const facility = await Facility.findById(facilityId);
    
      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found'
        });
      }

      const venueObjectId = new ObjectId(facility.venueId.toString());
   
      const booking = await db.collection('Booking').findOne({
        _id: new ObjectId(bookingId),
        venue: venueObjectId  // Use ObjectId
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }

      res.json({
        success: true,
        data: {
          _id: booking._id,
          courtName: booking.fieldName || `Court ${booking.courtNumber}`,
          bookingDate: booking.bookingDateString || booking.bookingDate,
          startTime: booking.startTimeString || booking.startTime,
          endTime: booking.endTimeString || booking.endTime,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          totalPrice: booking.totalPrice?.$numberDecimal || booking.totalPrice,
          paymentStatus: booking.paymentIntentStatus,
          bookingStatus: booking.bookingStatus,
          createdAt: booking.createdAt
        }
      });

    } catch (error) {
      console.error('Get booking details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch booking details',
        error: error.message
      });
    }
  },

  /**
   * Get booking statistics
   */
  getStats: async (req, res) => {
    try {
      const { facilityId } = req.vendor;
      const { date } = req.query;  // ADD: Get selected date from query params
      const db = require('mongoose').connection.db;
      const { ObjectId } = require('mongodb');

      // Get the Facility to find its venueId
      const Facility = require('../../models/mongodb/Facility');
      const facility = await Facility.findById(facilityId);

      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found'
        });
      }

      // Convert to ObjectId for proper comparison
      const venueObjectId = new ObjectId(facility.venueId.toString());

      // Use selected date if provided, otherwise use today
      let targetDate;
      if (date) {
        const [year, month, day] = date.split('-').map(Number);
        targetDate = new Date(year, month - 1, day);
      } else {
        targetDate = new Date();
      }
      targetDate.setHours(0, 0, 0, 0);
    
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get bookings for selected date (not "today", but the date being viewed)
      const selectedDateBookings = await db.collection('Booking').countDocuments({
        venue: venueObjectId,
        $or: [
          { startTime: { $gte: targetDate, $lt: nextDay } },
          { bookingDate: date },
          { bookingDateString: date }
        ],
        bookingStatus: { $in: ['Booked', 'Completed'] }
      });

      // Get bookings for CURRENT month (not selected date's month)
      const now = new Date();
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
    
      const monthBookings = await db.collection('Booking').countDocuments({
        venue: venueObjectId,
        $or: [
          { startTime: { $gte: monthStart, $lte: monthEnd } },
          { bookingDate: { $gte: monthStart, $lte: monthEnd } }
        ],
        bookingStatus: { $in: ['Booked', 'Completed'] }
      });

      res.json({
        success: true,
        data: {
          todayBookings: selectedDateBookings,  // Renamed for clarity - it's the selected date
          monthBookings, // Always current month
          facility: req.vendor.facilitySlug
        }
      });

    } catch (error) {
      console.error('Get booking stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error.message
      });
    }
  },

  /**
   * Cancel a booking
   */
  cancelBooking: async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { facilityId } = req.vendor;
      const { ObjectId } = require('mongodb');
    
      const db = require('mongoose').connection.db;
    
      // Get the Facility to find its venueId
      const Facility = require('../../models/mongodb/Facility');
      const facility = await Facility.findById(facilityId);
    
      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found'
        });
      }

      const venueObjectId = new ObjectId(facility.venueId.toString());
    
      // Find the booking
      const booking = await db.collection('Booking').findOne({
        _id: new ObjectId(bookingId),
        venue: venueObjectId
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }

      // Check if already cancelled
      if (booking.bookingStatus === 'Cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Booking is already cancelled'
        });
      }

      // Update booking status
      const updateResult = await db.collection('Booking').updateOne(
        { _id: new ObjectId(bookingId) },
        { 
          $set: { 
            bookingStatus: 'Cancelled',
            cancelledAt: new Date(),
            cancelledBy: 'vendor',
            vendorId: req.vendor.id
          } 
        }
      );

      if (updateResult.modifiedCount === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to cancel booking'
        });
      }

      // Send cancellation email to customer
      const emailService = require('../../services/emailService');
      await emailService.sendVendorCancellationEmail({
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
        courtName: booking.fieldName,
        bookingDate: booking.bookingDateString || booking.bookingDate,
        startTime: booking.startTimeString || booking.startTime,
        facilityName: facility.name,
        bookingId: bookingId,
        cancelledBy: 'facility'
      });

      logger.info('Vendor cancelled booking', {
        vendorId: req.vendor.id,
        bookingId,
        customerEmail: booking.customerEmail
      });

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          bookingId,
          status: 'Cancelled'
        }
      });

    } catch (error) {
      console.error('Cancel booking error:', error);
      logger.error('Cancel booking error', {
        vendorId: req.vendor.id,
        error: error.message
      });
    
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  },

  /**
   * 	 a manual booking (vendor-created)
   */
  createBooking: async (req, res) => {
    try {
      const { facilityId } = req.vendor;
      const { ObjectId } = require('mongodb');
      const {
        courtNumber,
        courtName,
        date,
        startTime,
        endTime,
        customerName,
        customerEmail,
        customerPhone,
        notes
      } = req.body;

      // Validation
      if (!courtName || !date || !startTime || !endTime || !customerName || !customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const db = require('mongoose').connection.db;
      
      // Get the Facility
      const Facility = require('../../models/mongodb/Facility');
      const facility = await Facility.findById(facilityId);
      
      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found'
        });
      }

      const venueObjectId = new ObjectId(facility.venueId.toString());

      // Check for overlapping bookings
      const existing = await db.collection('Booking').findOne({
        venue: venueObjectId,
        fieldName: courtName,
        $or: [
          { bookingDate: date, startTime: startTime },
          { bookingDateString: date, startTimeString: startTime }
        ],
        bookingStatus: { $in: ['Booked', 'Completed'] }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Time slot already booked'
        });
      }

      // Parse date and times - create UTC Date objects at midnight/specified hour
      const [year, month, day] = date.split('-').map(Number);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      // Create Date objects in UTC to match customer portal format
      const bookingDateUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const startTimeUTC = new Date(Date.UTC(year, month - 1, day, startHour, startMinute, 0));
      const endTimeUTC = new Date(Date.UTC(year, month - 1, day, endHour, endMinute, 0));

      // Create booking document with BOTH string and Date formats
      const newBooking = {
        // Venue info
        venue: venueObjectId,
        
        // Court info
        fieldName: courtName,
        courtNumber: courtNumber || parseInt(courtName.match(/\d+/)?.[0] || 0),
        
        // Date/Time - BOTH formats for maximum compatibility
        bookingDate: bookingDateUTC,        // Date object for customer portal queries
        bookingDateString: date,             // String for display
        startTime: startTimeUTC,             // Date object for customer portal queries
        startTimeString: startTime,          // String for display
        endTime: endTimeUTC,                 // Date object
        endTimeString: endTime,              // String for display
        
        // Customer info
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        
        // Booking status
        bookingStatus: 'Booked',
        status: 'confirmed',
        
        // Payment info
        paymentIntentStatus: 'Manual',
        totalPrice: { $numberDecimal: '0.00' },
        price: { $numberDecimal: '0.00' },
        pricePerHour: { $numberDecimal: '0.00' },
        tax: { $numberDecimal: '0.00' },
        convenienceFee: { $numberDecimal: '0.00' },
        discount: { $numberDecimal: '0.00' },
        
        // Vendor metadata
        isBookedByVendor: true,
        vendorId: req.vendor.id,
        source: 'vendor',
        
        // Additional fields
        notes: notes || '',
        gameName: 'Badminton',
        duration: { $numberDecimal: '1' },
        peoplePerGame: 1,
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // console.log('Creating vendor booking with UTC dates:', {
      //  bookingDate: bookingDateUTC.toISOString(),
      //  startTime: startTimeUTC.toISOString(),
      //  endTime: endTimeUTC.toISOString(),
      //  bookingDateString: date,
      //  startTimeString: startTime
      // });

      const result = await db.collection('Booking').insertOne(newBooking);

      // Send confirmation email to customer
      const emailService = require('../../services/emailService');
      await emailService.sendVendorBookingConfirmation({
        customerEmail,
        customerName,
        courtName,
        bookingDate: date,
        startTime,
        endTime,
        facilityName: facility.name,
        bookingId: result.insertedId.toString()
      });

      logger.info('Vendor created booking', {
        vendorId: req.vendor.id,
        bookingId: result.insertedId,
        customerEmail
      });

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          bookingId: result.insertedId,
          ...newBooking
        }
      });

    } catch (error) {
      console.error('Create booking error:', error);
      logger.error('Create booking error', {
        vendorId: req.vendor.id,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message
      });
    }
  }
};

module.exports = vendorBookingsController;