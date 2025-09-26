// src/controllers/mongodb/productionBookingController.js - Updated with new pricing and email timing
const Venue = require('../../models/mongodb/Venue');
const { ObjectId } = require('mongodb');
const emailService = require('../../services/emailService');

const productionBookingController = {
  createBooking: async (req, res) => {
    try {
      console.log('USING NEW MOBILE SCHEMA CONTROLLER - DEBUG LOG');
      console.log('Request body received:', req.body);

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

      // Check if venue exists
      const venue = await Venue.findById(facilityId);
      if (!venue) {
        return res.status(404).json({
          success: false,
          message: 'Venue not found',
          facilityId
        });
      }

      console.log('[Production MongoDB] Venue found:', venue.fullName);

      // Parse date components properly to avoid timezone issues
      const [year, month, day] = bookingDate.split('-').map(Number);
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      // Create proper date objects in local timezone
      const bookingStartTime = new Date(year, month - 1, day, startHour, startMin);
      const bookingEndTime = new Date(year, month - 1, day, endHour, endMin);
      const bookingDateOnly = new Date(year, month - 1, day);

      console.log('Date parsing:', {
        input: { bookingDate, startTime, endTime },
        parsed: {
          bookingStartTime: bookingStartTime.toISOString(),
          bookingEndTime: bookingEndTime.toISOString(),
          bookingDateOnly: bookingDateOnly.toISOString()
        }
      });

      // Check for time conflicts
      const db = require('mongoose').connection.db;
      
      const dayStart = new Date(year, month - 1, day, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59);
      
      const conflictingBookings = await db.collection('Booking').find({
        $and: [
          {
            $or: [
              { venue: facilityId },
              { venue: new ObjectId(facilityId) }
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
        console.log('Time conflict found:', {
          requestedSlot: { court: courtNumber, start: startTime, end: endTime },
          conflictingBookings: conflictingBookings.map(booking => ({
            court: booking.fieldName || booking.courtNumber,
            start: booking.startTime,
            end: booking.endTime,
            status: booking.bookingStatus || booking.status,
            source: booking.source || 'mobile'
          }))
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

      // NEW PRICING CALCULATION STRUCTURE
      const courtRental = 25.00; // Base court rental
      const serviceFee = courtRental * 0.01; // 1% service fee = $0.25
      const discountApplied = discountAmount || 0; // $2.50 if WELCOME10 applied
      const subtotal = courtRental + serviceFee - discountApplied; // $25.00 + $0.25 - $2.50 = $22.75
      const tax = subtotal * 0.13; // 13% tax = $2.96
      const finalTotal = subtotal + tax; // $22.75 + $2.96 = $25.71

      console.log('[Production MongoDB] Pricing breakdown:', {
        courtRental: courtRental.toFixed(2),
        serviceFee: serviceFee.toFixed(2),
        discountApplied: discountApplied.toFixed(2),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        finalTotal: finalTotal.toFixed(2)
      });

      // Create booking data with new pricing structure
      const bookingData = {
        venue: new ObjectId(facilityId),
        owner_id: "685a8e63a1e45e1eb270c9cb",
        bookingStatus: 'Booked',
        fieldName: `Court ${courtNumber}`,
        gameName: 'Badminton',
        
        // Updated pricing fields with new structure
        price: { $numberDecimal: courtRental.toFixed(2) }, // $25.00
        pricePerHour: { $numberDecimal: "25.00" }, // Updated from 1.00
        totalPrice: { $numberDecimal: finalTotal.toFixed(2) }, // $25.71
        
        // Fee calculations
        serviceFeePercentage: { $numberDecimal: "1.00" }, // Changed from convenienceFeePercentage
        taxPercentage: { $numberDecimal: "13.00" },
        serviceFee: { $numberDecimal: serviceFee.toFixed(2) }, // $0.25
        tax: { $numberDecimal: tax.toFixed(2) }, // $2.96
        subtotal: { $numberDecimal: subtotal.toFixed(2) }, // $22.75
        
        // Discount handling
        discountPercentage: { $numberDecimal: discountCode ? "10" : "0" },
        discount: { $numberDecimal: discountApplied.toFixed(2) },
        priceAfterDeductingDiscount: { $numberDecimal: (courtRental - discountApplied).toFixed(2) },
        
        // Time fields
        duration: { $numberDecimal: ((duration || 60) / 60).toString() },
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        bookingDate: bookingDateOnly,
        
        // Payment and booking details
        currency: "cad",
        paymentIntentStatus: "Pending", // Changed from "Success" since payment hasn't happened yet
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

      console.log('About to insert booking data with proper ObjectId format:', {
        venue: bookingData.venue,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        bookingDate: bookingData.bookingDate,
        player: bookingData.player
      });

      // Insert booking
      const result = await db.collection('Booking').insertOne(bookingData);
      console.log('MongoDB insert result:', result.acknowledged);

      // Fetch the created booking
      const createdBooking = await db.collection('Booking').findOne({ _id: result.insertedId });
      
      console.log('[Production MongoDB] Booking created successfully:', result.insertedId);

      // NOTE: Email sending removed from here - will be sent after payment confirmation

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          _id: result.insertedId,
          id: result.insertedId, // Add both formats for frontend compatibility
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
        _id: new require('mongodb').ObjectId(id) 
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
        { _id: new require('mongodb').ObjectId(id) },
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
        _id: new require('mongodb').ObjectId(id) 
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
        _id: new require('mongodb').ObjectId(id) 
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check if booking can be cancelled (24 hours rule)
      const now = new Date();
      const bookingDateTime = new Date(booking.startTime);
      const timeDiff = bookingDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      const canCancel = hoursDiff > 24 && ['Booked', 'Completed'].includes(booking.bookingStatus);

      res.json({
        success: true,
        data: {
          booking,
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
        _id: new require('mongodb').ObjectId(id) 
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check 24-hour rule
      const now = new Date();
      const bookingDateTime = new Date(booking.startTime);
      const timeDiff = bookingDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff <= 24) {
        return res.status(400).json({
          success: false,
          message: 'Bookings cannot be cancelled within 24 hours of the scheduled time',
          hoursUntilBooking: Math.max(0, hoursDiff)
        });
      }

      if (!['Booked', 'Completed'].includes(booking.bookingStatus)) {
        return res.status(400).json({
          success: false,
          message: 'This booking cannot be cancelled'
        });
      }

      // Cancel the booking
      const result = await db.collection('Booking').updateOne(
        { _id: new require('mongodb').ObjectId(id) },
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
        bookingDate: booking.bookingDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        startTime: booking.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        endTime: booking.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        bookingId: booking._id.toString()
      };

      try {
        await emailService.sendCancellationConfirmation(emailData);
        console.log('[Production MongoDB] Cancellation email sent successfully');
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

  // NEW METHOD: Send confirmation email after successful payment
  confirmPayment: async (req, res) => {
    try {
      const { bookingId, paymentIntentId } = req.body;
      
      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required'
        });
      }

      const db = require('mongoose').connection.db;
      
      // Update booking status to paid
      const updateResult = await db.collection('Booking').updateOne(
        { _id: new require('mongodb').ObjectId(bookingId) },
        { 
          $set: { 
            paymentIntentStatus: 'Success',
            paymentIntentId: paymentIntentId,
            paidAt: new Date()
          } 
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Get the updated booking
      const booking = await db.collection('Booking').findOne({ 
        _id: new require('mongodb').ObjectId(bookingId) 
      });

      // Send confirmation email AFTER successful payment
      const emailData = {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        facilityName: 'Vision Badminton Centre',
        courtName: booking.fieldName,
        bookingDate: booking.bookingDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        startTime: booking.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        endTime: booking.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        duration: 60,
        courtRental: booking.price?.$numberDecimal || '25.00',
        serviceFee: booking.serviceFee?.$numberDecimal || '0.25',
        discountAmount: booking.discount?.$numberDecimal || '0.00',
        subtotal: booking.subtotal?.$numberDecimal || '25.25',
        tax: booking.tax?.$numberDecimal || '3.28',
        totalAmount: booking.totalPrice?.$numberDecimal || '28.53',
        bookingId: booking._id.toString(),
        cancelUrl: `${process.env.FRONTEND_URL}/cancel-booking?id=${booking._id.toString()}`
      };

      try {
        await emailService.sendBookingConfirmation(emailData);
        console.log('[Production MongoDB] Confirmation email sent after successful payment');
      } catch (emailError) {
        console.error('[Production MongoDB] Failed to send confirmation email:', emailError);
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
      console.error('[Production MongoDB] Error confirming payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        error: error.message
      });
    }
  }
};

module.exports = productionBookingController;