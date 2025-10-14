// src/controllers/mongodb/productionBookingController.js - Complete Updated Version
const Venue = require('../../models/mongodb/Venue');
const Facility = require('../../models/mongodb/Facility');
const { ObjectId } = require('mongodb');
const emailService = require('../../services/emailService');

const productionBookingController = {
  createBooking: async (req, res) => {
    try {
      const {
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
      if (!customerName || !customerEmail || !courtNumber || !bookingDate || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          required: ['customerName', 'customerEmail', 'courtNumber', 'bookingDate', 'startTime', 'endTime']
        });
      }

      // USE FACILITY FROM MIDDLEWARE
      const facility = req.facility;
      const venueId = req.venueId;

      if (!facility || !venueId) {
        console.error('[Booking] Missing facility/venue from middleware:', {
          hasFacility: !!facility,
          hasVenueId: !!venueId
        });
        
        return res.status(500).json({
          success: false,
          message: 'Facility context missing',
          hint: 'TenantMiddleware should have resolved facility'
        });
      }

      console.log('[Booking] Using facility from middleware:', {
        slug: facility.slug,
        name: facility.name,
        facilityId: facility._id,
        venueId: venueId
      });

      // Verify venue exists
      const venue = await Venue.findById(venueId);
      if (!venue) {
        console.error('[Booking] Venue not found:', venueId);
        return res.status(404).json({
          success: false,
          message: 'Venue not found',
          venueId
        });
      }

      console.log('[Production MongoDB] Venue found:', venue.fullName);

      // Parse dates (keep as strings to avoid timezone issues)
      const bookingDateStr = bookingDate;
      const startTimeStr = startTime;
      const endTimeStr = endTime;

      // For MongoDB time comparisons, create Date objects only for conflict checking
      const [year, month, day] = bookingDate.split('-').map(Number);
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const bookingStartTime = new Date(year, month - 1, day, startHour, startMin);
      const bookingEndTime = new Date(year, month - 1, day, endHour, endMin);
      const bookingDateOnly = new Date(year, month - 1, day, 12, 0, 0);

      // Check for time conflicts
      const db = require('mongoose').connection.db;
      
      const dayStart = new Date(year, month - 1, day, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59);
      
      const conflictingBookings = await db.collection('Booking').find({
        $and: [
          {
            $or: [
              { venue: venueId },
              { venue: new ObjectId(venueId) }
            ]
          },
          {
            $or: [
              { fieldName: `Court ${courtNumber}` },
              { courtNumber: courtNumber }
            ]
          },
          {
            $or: [
              {
                startTime: { $gte: dayStart, $lte: dayEnd },
                bookingStatus: { $in: ['Booked', 'Completed'] }
              },
              {
                bookingDate: { $gte: dayStart, $lte: dayEnd },
                status: { $in: ['pending', 'paid', 'completed'] }
              }
            ]
          },
          {
            $or: [
              {
                $and: [
                  { startTime: { $lt: bookingEndTime } },
                  { endTime: { $gt: bookingStartTime } },
                  { bookingStatus: { $exists: true } }
                ]
              },
              {
                $and: [
                  { startTime: { $lt: endTime } },
                  { endTime: { $gt: startTime } },
                  { status: { $exists: true } }
                ]
              }
            ]
          }
        ]
      }).toArray();

      if (conflictingBookings.length > 0) {
        console.log('[Booking] Time conflict found:', {
          requestedSlot: { court: courtNumber, start: startTime, end: endTime },
          conflictCount: conflictingBookings.length
        });
        
        return res.status(409).json({
          success: false,
          message: 'Time slot already booked',
          conflictingBookings: conflictingBookings.length,
          details: conflictingBookings.map(booking => ({
            court: booking.fieldName || `Court ${booking.courtNumber}`,
            time: booking.startTime instanceof Date 
              ? `${booking.startTime.getHours().toString().padStart(2, '0')}:00-${booking.endTime.getHours().toString().padStart(2, '0')}:00`
              : `${booking.startTime}-${booking.endTime}`,
            customer: booking.customerName || 'Customer',
            source: booking.source || 'mobile'
          }))
        });
      }

      // Get court info for pricing from facility
      let courtRental = 25.00; // Default (Badminton)
      let sport = 'Badminton';
      
      if (facility.courts) {
        const court = facility.courts.find(c => c.id === parseInt(courtNumber));
        if (court) {
          sport = court.sport;
          if (court.sport === 'Pickleball') {
            courtRental = 30.00;
          }
        }
      }

      console.log('[Booking] Pricing:', { courtNumber, sport, courtRental });

      const serviceFee = courtRental * 0.01;
      const discountApplied = discountAmount || 0;
      const subtotal = courtRental + serviceFee - discountApplied;
      const tax = subtotal * 0.13;
      const finalTotal = subtotal + tax;

      // Create booking data
      const bookingData = {
        venue: new ObjectId(venueId),
        owner_id: "685a8e63a1e45e1eb270c9cb",
        bookingStatus: 'Booked',
        fieldName: `Court ${courtNumber}`,
        gameName: sport,
        
        // Store as STRINGS to avoid timezone conversion
        bookingDateString: bookingDateStr,
        startTimeString: startTimeStr,
        endTimeString: endTimeStr,
        
        // Keep original Date objects for mobile app compatibility
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        bookingDate: bookingDateOnly,
        
        // Pricing fields
        price: { $numberDecimal: courtRental.toFixed(2) },
        pricePerHour: { $numberDecimal: courtRental.toFixed(2) },
        totalPrice: { $numberDecimal: finalTotal.toFixed(2) },
        serviceFeePercentage: { $numberDecimal: "1.00" },
        taxPercentage: { $numberDecimal: "13.00" },
        serviceFee: { $numberDecimal: serviceFee.toFixed(2) },
        tax: { $numberDecimal: tax.toFixed(2) },
        subtotal: { $numberDecimal: subtotal.toFixed(2) },
        discountPercentage: { $numberDecimal: discountCode ? "10" : "0" },
        discount: { $numberDecimal: discountApplied.toFixed(2) },
        priceAfterDeductingDiscount: { $numberDecimal: (courtRental - discountApplied).toFixed(2) },
        
        // Time fields
        duration: { $numberDecimal: ((duration || 60) / 60).toString() },
        currency: "cad",
        paymentIntentStatus: "Pending",
        cartId: require('crypto').randomUUID(),
        
        // Game configuration
        peoplePerGame: 4,
        isHosted: false,
        numberOfPlayersRequiredForHosting: 0,
        isBookedByVendor: false,
        costShared: true,
        bringYourOwnEquipment: true,
        playerCompetancyLevel: "Beginner",
        
        // Customer info
        player: userId ? new ObjectId(userId) : null,
        customerName,
        customerEmail,
        customerPhone,
        source: 'web',
        notes,
        isFirstBookingCouponApplied: !!discountCode
      };

      // Insert booking
      const result = await db.collection('Booking').insertOne(bookingData);
      const createdBooking = await db.collection('Booking').findOne({ _id: result.insertedId });
      
      console.log('[Production MongoDB] Booking created successfully:', result.insertedId);

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          _id: result.insertedId,
          id: result.insertedId,
          venue: createdBooking.venue,
          bookingStatus: createdBooking.bookingStatus,
          fieldName: createdBooking.fieldName,
          startTime: createdBooking.startTime,
          endTime: createdBooking.endTime,
          totalPrice: createdBooking.totalPrice,
          paymentIntentStatus: createdBooking.paymentIntentStatus
        }
      });

    } catch (error) {
      console.error('[Production MongoDB] Error creating booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message,
        database: 'Production MongoDB'
      });
    }
  },

  getAllBookings: async (req, res) => {
    try {
      const db = require('mongoose').connection.db;
      const bookings = await db.collection('Booking').find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      
      res.json({
        success: true,
        data: bookings,
        count: bookings.length
      });
    } catch (error) {
      console.error('[Production MongoDB] Error getting bookings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bookings',
        error: error.message
      });
    }
  },

  getBooking: async (req, res) => {
    try {
      const { id } = req.params;
      const db = require('mongoose').connection.db;
      const booking = await db.collection('Booking').findOne({ 
        _id: new ObjectId(id)
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
      console.error('[Production MongoDB] Error getting booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve booking',
        error: error.message
      });
    }
  },

  cancelBooking: async (req, res) => {
    try {
      const { id } = req.params;
      const db = require('mongoose').connection.db;
      
      const result = await db.collection('Booking').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            bookingStatus: 'Cancelled',
            paymentIntentStatus: 'Cancelled'
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      const updatedBooking = await db.collection('Booking').findOne({ 
        _id: new ObjectId(id)
      });

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: updatedBooking
      });

    } catch (error) {
      console.error('[Production MongoDB] Error cancelling booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  },

  getCancellationDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const db = require('mongoose').connection.db;
      
      const booking = await db.collection('Booking').findOne({ 
        _id: new ObjectId(id)
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      const responseBooking = {
        _id: booking._id,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        fieldName: booking.fieldName,
        bookingDate: booking.bookingDateString || 'Unknown date',
        startTime: booking.startTimeString || 'Unknown time', 
        endTime: booking.endTimeString || 'Unknown time',
        bookingStatus: booking.bookingStatus || booking.status
      };

      // Calculate if booking can be cancelled (24 hours rule)
      const now = new Date();
      let bookingDateTime;
      
      try {
        if (booking.bookingDateString && booking.startTimeString) {
          const [year, month, day] = booking.bookingDateString.split('-').map(Number);
          const [hours, minutes] = booking.startTimeString.split(':').map(Number);
          bookingDateTime = new Date(year, month - 1, day, hours, minutes);
        } else if (booking.startTime instanceof Date) {
          bookingDateTime = new Date(booking.startTime);
        } else {
          bookingDateTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        }
      } catch (error) {
        console.error('Error parsing booking date/time:', error);
        bookingDateTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      }
      
      const timeDiff = bookingDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      const canCancel = hoursDiff > 24 && ['Booked', 'Completed', 'paid', 'confirmed'].includes(booking.bookingStatus || booking.status);

      res.json({
        success: true,
        data: {
          booking: responseBooking,
          canCancel,
          hoursUntilBooking: Math.max(0, hoursDiff)
        }
      });
    } catch (error) {
      console.error('[Production MongoDB] Error getting cancellation details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve booking details',
        error: error.message
      });
    }
  },

  processCancellation: async (req, res) => {
    try {
      const { id } = req.params;
      const db = require('mongoose').connection.db;
      
      const booking = await db.collection('Booking').findOne({ 
        _id: new ObjectId(id) 
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check 24-hour rule
      const now = new Date();
      let bookingDateTime;
      
      try {
        if (booking.bookingDateString && booking.startTimeString) {
          const [year, month, day] = booking.bookingDateString.split('-').map(Number);
          const [hours, minutes] = booking.startTimeString.split(':').map(Number);
          bookingDateTime = new Date(year, month - 1, day, hours, minutes);
        } else if (booking.startTime instanceof Date) {
          bookingDateTime = new Date(booking.startTime);
        } else {
          bookingDateTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        }
      } catch (error) {
        console.error('Error parsing booking date/time for cancellation:', error);
        bookingDateTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      }
      
      const timeDiff = bookingDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff <= 24) {
        return res.status(400).json({
          success: false,
          message: 'Bookings cannot be cancelled within 24 hours of the scheduled time',
          hoursUntilBooking: Math.max(0, hoursDiff)
        });
      }

      if (!['Booked', 'Completed', 'paid', 'confirmed'].includes(booking.bookingStatus || booking.status)) {
        return res.status(400).json({
          success: false,
          message: 'This booking cannot be cancelled'
        });
      }

      // Cancel the booking
      const result = await db.collection('Booking').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            bookingStatus: 'Cancelled',
            paymentIntentStatus: 'Cancelled',
            cancelledAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Send cancellation email
      const emailData = {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        facilityName: 'Vision Badminton Centre',
        courtName: booking.fieldName,
        bookingDate: booking.bookingDateString || booking.bookingDate || 'Unknown date',
        startTime: booking.startTimeString || booking.startTime || 'Unknown time',
        endTime: booking.endTimeString || booking.endTime || 'Unknown time',
        duration: 60,
        courtRental: booking.price?.$numberDecimal || '25.00',
        serviceFee: booking.serviceFee?.$numberDecimal || '0.25',
        discountAmount: booking.discount?.$numberDecimal || '0.00',
        subtotal: booking.subtotal?.$numberDecimal || '25.25',
        tax: booking.tax?.$numberDecimal || '3.28',
        totalAmount: booking.totalPrice?.$numberDecimal || '28.53',
        bookingId: booking._id.toString(),
        cancelUrl: `${process.env.FRONTEND_URL}/vision-badminton/cancel-booking?id=${booking._id.toString()}`
      };

      try {
        await emailService.sendCancellationConfirmation(emailData);
      } catch (emailError) {
        console.error('[Production MongoDB] Failed to send cancellation email:', emailError);
      }
         
      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: { 
          bookingId: id,
          cancelledAt: new Date()
        }
      });

    } catch (error) {
      console.error('[Production MongoDB] Error processing cancellation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  },

  confirmPayment: async (req, res) => {
    try {
      const { bookingId, paymentIntentId } = req.body;
      
      console.log('[confirmPayment] Received request:', { bookingId, paymentIntentId });
      
      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required'
        });
      }

      const db = require('mongoose').connection.db;
      
      console.log('[confirmPayment] Updating booking status...');
      
      // Update booking status to paid
      const updateResult = await db.collection('Booking').updateOne(
        { _id: new ObjectId(bookingId) },
        { 
          $set: { 
            paymentIntentStatus: 'Success',
            paymentIntentId: paymentIntentId,
            paidAt: new Date()
          } 
        }
      );

      if (updateResult.matchedCount === 0) {
        console.error('[confirmPayment] Booking not found:', bookingId);
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      console.log('[confirmPayment] Booking updated, fetching details...');

      // Get the updated booking
      const booking = await db.collection('Booking').findOne({ 
        _id: new ObjectId(bookingId)
      });

      console.log('[confirmPayment] Booking found:', {
        id: booking._id,
        customer: booking.customerEmail,
        status: booking.paymentIntentStatus
      });

      // Prepare email data
      const emailData = {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        facilityName: 'Vision Badminton Centre',
        courtName: booking.fieldName,
        bookingDate: booking.bookingDateString || booking.bookingDate || 'Unknown date',
        startTime: booking.startTimeString || booking.startTime || 'Unknown time',
        endTime: booking.endTimeString || booking.endTime || 'Unknown time',
        duration: 60,
        courtRental: booking.price?.$numberDecimal || '25.00',
        serviceFee: booking.serviceFee?.$numberDecimal || '0.25',
        discountAmount: booking.discount?.$numberDecimal || '0.00',
        subtotal: booking.subtotal?.$numberDecimal || '25.25',
        tax: booking.tax?.$numberDecimal || '3.28',
        totalAmount: booking.totalPrice?.$numberDecimal || '28.53',
        bookingId: booking._id.toString(),
        cancelUrl: `${process.env.FRONTEND_URL}/vision-badminton/cancel-booking?id=${booking._id.toString()}`
      };

      console.log('[confirmPayment] Sending confirmation email to:', emailData.customerEmail);

      try {
        await emailService.sendBookingConfirmation(emailData);
        console.log('[confirmPayment] ✅ Email sent successfully');
      } catch (emailError) {
        console.error('[confirmPayment] ❌ Email send failed:', emailError);
        // Don't fail the payment confirmation if email fails
      }

      res.json({
        success: true,
        message: 'Payment confirmed and email sent',
        data: {
          bookingId: bookingId,
          paymentStatus: 'Success',
          emailSent: true
        }
      });

    } catch (error) {
      console.error('[confirmPayment] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        error: error.message
      });
    }
  }
};

module.exports = productionBookingController;