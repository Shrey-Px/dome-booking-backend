// src/controllers/mongodb/productionBookingController.js - Updated with new pricing and email timing
const Venue = require('../../models/mongodb/Venue');
const { ObjectId } = require('mongodb');
const emailService = require('../../services/emailService');

const productionBookingController = {
  createBooking: async (req, res) => {
    try {
      // console.log('USING NEW MOBILE SCHEMA CONTROLLER - DEBUG LOG');
      // console.log('Request body received:', req.body);

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
      const Venue = require('../../models/mongodb/Venue');
      const venue = await Venue.findById(facilityId);
      if (!venue) {
        return res.status(404).json({
          success: false,
          message: 'Venue not found',
          facilityId
        });
      }

      // console.log('[Production MongoDB] Venue found:', venue.fullName);

      // SIMPLIFIED: Keep dates and times as strings to avoid timezone issues
      const bookingDateStr = bookingDate; // Keep as "2025-10-04"
      const startTimeStr = startTime;     // Keep as "08:00"
      const endTimeStr = endTime;         // Keep as "09:00"

      // console.log('SIMPLIFIED Date handling (strings only):', {
      //  bookingDate: bookingDateStr,
      //  startTime: startTimeStr,
      //  endTime: endTimeStr
      // });

      // For MongoDB time comparisons, create Date objects only for conflict checking
      const [year, month, day] = bookingDate.split('-').map(Number);
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const bookingStartTime = new Date(year, month - 1, day, startHour, startMin);
      const bookingEndTime = new Date(year, month - 1, day, endHour, endMin);
      const bookingDateOnly = new Date(year, month - 1, day, 12, 0, 0); // FIXED: Added back for MongoDB storage

      // console.log('Date parsing for conflict checking:', {
      //   input: { bookingDate, startTime, endTime },
      //   parsed: {
      //     bookingStartTime: bookingStartTime.toString(),
      //     bookingEndTime: bookingEndTime.toString(),
      //     bookingDateOnly: bookingDateOnly.toString()
      //   }
      // });

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

      // if (conflictingBookings.length > 0) {
        // console.log('Time conflict found:', {
        //  requestedSlot: { court: courtNumber, start: startTime, end: endTime },
        //  conflictingBookings: conflictingBookings.map(booking => ({
        //    court: booking.fieldName || booking.courtNumber,
        //    start: booking.startTime,
        //    end: booking.endTime,
        //    status: booking.bookingStatus || booking.status,
        //    source: booking.source || 'mobile'
        //  }))
        // });
        
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

      // console.log('[Production MongoDB] Pricing breakdown:', {
      //  courtRental: courtRental.toFixed(2),
      //  serviceFee: serviceFee.toFixed(2),
      //  discountApplied: discountApplied.toFixed(2),
      //  subtotal: subtotal.toFixed(2),
      //  tax: tax.toFixed(2),
      //  finalTotal: finalTotal.toFixed(2)
      // });

      // Create booking data with STRING dates/times AND Date objects for compatibility
      const bookingData = {
        venue: new ObjectId(facilityId),
        owner_id: "685a8e63a1e45e1eb270c9cb",
        bookingStatus: 'Booked',
        fieldName: `Court ${courtNumber}`,
        gameName: 'Badminton',
        
        // Store as STRINGS to avoid timezone conversion (NEW)
        bookingDateString: bookingDateStr,  // "2025-10-04"
        startTimeString: startTimeStr,      // "08:00"
        endTimeString: endTimeStr,          // "09:00"
        
        // Keep original Date objects for mobile app compatibility
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        bookingDate: bookingDateOnly,
        
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

      // console.log('About to insert booking data with proper ObjectId format:', {
      //  venue: bookingData.venue,
      //  startTime: bookingData.startTime,
      //  endTime: bookingData.endTime,
      //  bookingDate: bookingData.bookingDate,
      //  player: bookingData.player,
        // Show string fields too
      //  bookingDateString: bookingData.bookingDateString,
      //  startTimeString: bookingData.startTimeString,
      //  endTimeString: bookingData.endTimeString
      // });

      // Insert booking
      const result = await db.collection('Booking').insertOne(bookingData);
      // console.log('MongoDB insert result:', result.acknowledged);

      // Fetch the created booking
      const createdBooking = await db.collection('Booking').findOne({ _id: result.insertedId });
      
      // console.log('[Production MongoDB] Booking created successfully:', result.insertedId);

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

      // console.log('Retrieved booking for cancellation:', booking);

      // SIMPLIFIED: Create consistent response using string fields
      const responseBooking = {
        _id: booking._id,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        fieldName: booking.fieldName,
        
        // Use string fields for consistent display
        bookingDate: booking.bookingDateString || 'Unknown date',
        startTime: booking.startTimeString || 'Unknown time', 
        endTime: booking.endTimeString || 'Unknown time',
        
        bookingStatus: booking.bookingStatus || booking.status
      };

      // Calculate if booking can be cancelled (24 hours rule)
      const now = new Date();
      let bookingDateTime;
      
      try {
        // Try to create a proper Date object for comparison
        if (booking.bookingDateString && booking.startTimeString) {
          const [year, month, day] = booking.bookingDateString.split('-').map(Number);
          const [hours, minutes] = booking.startTimeString.split(':').map(Number);
          bookingDateTime = new Date(year, month - 1, day, hours, minutes);
        } else if (booking.startTime instanceof Date) {
          bookingDateTime = new Date(booking.startTime);
        } else {
          // Fallback - assume it can be cancelled
          bookingDateTime = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours from now
        }
      } catch (error) {
        console.error('Error parsing booking date/time:', error);
        // Default to allowing cancellation if we can't parse
        bookingDateTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      }
      
      const timeDiff = bookingDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      const canCancel = hoursDiff > 24 && ['Booked', 'Completed', 'paid', 'confirmed'].includes(booking.bookingStatus || booking.status);

      // console.log('Cancellation calculation:', {
      //  now: now.toString(),
      //  bookingDateTime: bookingDateTime.toString(),
      //  hoursDiff,
      //  canCancel,
      //  bookingStatus: booking.bookingStatus || booking.status
      // });

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


      // Check 24-hour rule (same logic as getCancellationDetails)
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

      // SIMPLIFIED: Send cancellation email with string data
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
  	cancelUrl: `${process.env.FRONTEND_URL}/vision-badminton/cancel-booking?id=${booking._id.toString()}` // FIXED
      };

      // console.log('SIMPLIFIED Cancellation email data:', emailData);

      try {
        await emailService.sendCancellationConfirmation(emailData);
        // console.log('[Production MongoDB] Cancellation email sent successfully');
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
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Get the updated booking
      const booking = await db.collection('Booking').findOne({ 
        _id: new ObjectId(bookingId)
      });

      // console.log('Retrieved booking for email:', booking);

      // Send confirmation email AFTER successful payment with FIXED date handling
      const emailData = {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        facilityName: 'Vision Badminton Centre',
        courtName: booking.fieldName,

        // Use string fields first, with fallbacks
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

      // console.log('SIMPLIFIED Email data being sent:', emailData);

      try {
        await emailService.sendBookingConfirmation(emailData);
        // console.log('[Production MongoDB] Confirmation email sent after successful payment');
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