// src/controllers/mongodb/productionBookingController.js - Using TenantMiddleware properly
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

      // ✅ USE FACILITY FROM MIDDLEWARE
      // TenantMiddleware has already resolved the facility and attached it to req
      const facility = req.facility;
      const venueId = req.venueId;

      if (!facility || !venueId) {
        console.error('[Booking] Missing facility/venue from middleware:', {
          hasFacility: !!facility,
          hasVenueId: !!venueId,
          reqFacility: req.facility,
          reqVenueId: req.venueId
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

  // ... rest of methods remain the same ...
  getAllBookings: async (req, res) => { /* same as before */ },
  getBooking: async (req, res) => { /* same as before */ },
  cancelBooking: async (req, res) => { /* same as before */ },
  getCancellationDetails: async (req, res) => { /* same as before */ },
  processCancellation: async (req, res) => { /* same as before */ },
  confirmPayment: async (req, res) => { /* same as before */ }
};

module.exports = productionBookingController;