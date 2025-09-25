// src/controllers/mongodb/productionBookingController.js - Complete Fixed Version with ObjectId compatibility
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

      // FIXED: Check for time conflicts using proper MongoDB query that handles both ObjectId and string venue formats
      const db = require('mongoose').connection.db;
      
      const dayStart = new Date(year, month - 1, day, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59);
      
      const conflictingBookings = await db.collection('Booking').find({
        $and: [
          // FIXED: Search for both string and ObjectId venue formats
          {
            $or: [
              { venue: facilityId }, // String format (web bookings)
              { venue: new ObjectId(facilityId) } // ObjectId format (mobile bookings)
            ]
          },
          // Court matching condition
          {
            $or: [
              { fieldName: `Court ${courtNumber}` }, // Mobile format
              { courtNumber: courtNumber } // Old web format
            ]
          },
          // Time and status matching condition
          {
            $or: [
              // Mobile format with Date objects
              {
                startTime: { $gte: dayStart, $lte: dayEnd },
                bookingStatus: { $in: ['Booked', 'Completed'] }
              },
              // Old web format with date strings
              {
                bookingDate: { $gte: dayStart, $lte: dayEnd },
                status: { $in: ['pending', 'paid', 'completed'] }
              }
            ]
          },
          // Additional time overlap check for precision
          {
            $or: [
              // For mobile format bookings - check actual time overlap
              {
                $and: [
                  { startTime: { $lt: bookingEndTime } },
                  { endTime: { $gt: bookingStartTime } },
                  { bookingStatus: { $exists: true } }
                ]
              },
              // For old web format bookings - check time string overlap
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

      // Calculate pricing to match mobile app
      const finalAmount = totalAmount - (discountAmount || 0);
      const convenienceFeePercentage = 3;
      const taxPercentage = 13;
      
      const convenienceFee = finalAmount * (convenienceFeePercentage / 100);
      const priceAfterConvenience = finalAmount + convenienceFee;
      const tax = priceAfterConvenience * (taxPercentage / 100);
      const calculatedTotalPrice = priceAfterConvenience + tax;

      // FIXED: Create booking data with mobile app schema using proper ObjectId format
      const bookingData = {
        // FIXED: Mobile app core fields with proper data types
        venue: new ObjectId(facilityId), // ObjectId instead of string
        owner_id: "68cad6b20a06da55dfb88af5",
        bookingStatus: 'Booked',
        fieldName: `Court ${courtNumber}`,
        gameName: 'Badminton',
        
        // Pricing with Decimal128 format
        price: { $numberDecimal: finalAmount.toFixed(2) },
        pricePerHour: { $numberDecimal: "1.00" },
        totalPrice: { $numberDecimal: calculatedTotalPrice.toFixed(2) },
        
        // Fee calculations
        convenienceFeePercentage: { $numberDecimal: convenienceFeePercentage.toString() },
        taxPercentage: { $numberDecimal: taxPercentage.toString() },
        convenienceFee: { $numberDecimal: convenienceFee.toFixed(2) },
        tax: { $numberDecimal: tax.toFixed(2) },
        priceAfterAddingConvenienceFee: { $numberDecimal: priceAfterConvenience.toFixed(2) },
        
        // Discount handling
        discountPercentage: { $numberDecimal: discountCode ? "10" : "0" },
        discount: { $numberDecimal: (discountAmount || 0).toFixed(2) },
        priceAfterDeductingDiscount: { $numberDecimal: finalAmount.toFixed(2) },
        
        // Time fields - use proper date objects
        duration: { $numberDecimal: ((duration || 60) / 60).toString() },
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        bookingDate: bookingDateOnly,
        
        // Payment and booking details
        currency: "cad",
        paymentIntentStatus: "Success",
        cartId: require('crypto').randomUUID(),
        
        // Game configuration
        peoplePerGame: 4,
        isHosted: false,
        numberOfPlayersRequiredForHosting: 0,
        isBookedByVendor: false,
        costShared: true,
        bringYourOwnEquipment: true,
        playerCompetancyLevel: "Beginner",
        
        // FIXED: Player and customer info with proper ObjectId handling
        player: userId ? new ObjectId(userId) : null, // ObjectId or null for mobile compatibility
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
      // Send confirmation email
      const bookingEmailData = {
        customerName: customerName,
        customerEmail: customerEmail,
  	facilityName: 'Vision Badminton Centre',
  	courtName: `Court ${courtNumber}`,
  	bookingDate: bookingDate,
  	startTime: startTime,
  	endTime: endTime,
  	duration: duration,
  	totalAmount: calculatedTotalPrice.toFixed(2),
  	bookingId: result.insertedId.toString(),
  	cancelUrl: `${process.env.FRONTEND_URL}/cancel-booking?id=${result.insertedId.toString()}`
      };

      try {
  	await emailService.sendBookingConfirmation(bookingEmailData);
  	console.log('[Production MongoDB] Confirmation email sent successfully');
      } catch (emailError) {
  	console.error('[Production MongoDB] Failed to send confirmation email:', emailError);
  	// Don't fail the booking if email fails
      }

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          _id: result.insertedId,
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
    console.error('Error getting cancellation details:', error);
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
      bookingDate: booking.bookingDate.toISOString().split('T')[0],
      startTime: booking.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      endTime: booking.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      bookingId: booking._id.toString()
    };

    try {
      await emailService.sendCancellationConfirmation(emailData);
      console.log('Cancellation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
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
    console.error('Error processing cancellation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
}

module.exports = productionBookingController;