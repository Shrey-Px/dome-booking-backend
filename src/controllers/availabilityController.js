// src/controllers/availabilityController.js - FIXED for correct enum values
const { Booking, Facility } = require('../models');
const { Op } = require('sequelize');

const availabilityController = {
  getAvailability: async (req, res) => {
    try {
      console.log('📅 Getting availability...');
      console.log('Query params:', req.query);

      const { facility_id, date } = req.query;

      if (!facility_id || !date) {
        return res.status(400).json({
          success: false,
          message: 'facility_id and date are required',
          received: { facility_id, date }
        });
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        console.log('❌ Invalid date format:', date);
        return res.status(400).json({
          success: false,
          message: 'Date must be in YYYY-MM-DD format',
          received: date
        });
      }

      console.log(`🔍 Looking for facility: ${facility_id}`);

      // Check if facility exists
      let facility;
      try {
        facility = await Facility.findByPk(facility_id);
        console.log('🏢 Facility query result:', facility ? 'Found' : 'Not found');
        
        if (!facility) {
          console.log('❌ Facility not found in database');
          return res.status(404).json({
            success: false,
            message: 'Facility not found',
            facilityId: facility_id
          });
        }
      } catch (dbError) {
        console.error('❌ Database error while finding facility:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error while finding facility',
          error: dbError.message
        });
      }

      console.log(`🔍 Looking for bookings on ${date}...`);

      // FIXED: Use only the status values that exist in your database enum
      let existingBookings;
      try {
        existingBookings = await Booking.findAll({
          where: {
            facilityId: facility_id,
            bookingDate: date,
            status: {
              [Op.in]: ['pending', 'paid', 'completed'] // REMOVED 'confirmed' - it doesn't exist in your enum
            }
          },
          order: [['startTime', 'ASC']],
          raw: true
        });

        console.log(`📋 Found ${existingBookings.length} bookings for ${date}`);
        
        // Log booking details for debugging
        existingBookings.forEach((booking, index) => {
          console.log(`📋 Booking ${index + 1}: Court ${booking.courtNumber}, ${booking.startTime}-${booking.endTime}, Status: ${booking.status}, Customer: ${booking.customerName}`);
        });
        
      } catch (dbError) {
        console.error('❌ Database error while finding bookings:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error while finding bookings',
          error: dbError.message
        });
      }

      // Generate availability for each court
      const availability = {};
      
      // Use the courts from the facility data
      const courts = facility.courts || [
        { id: 1, name: 'Court 1' },
        { id: 2, name: 'Court 2' },
        { id: 3, name: 'Court 3' },
        { id: 4, name: 'Court 4' },
        { id: 5, name: 'Court 5' },
        { id: 6, name: 'Court 6' }
      ];

      courts.forEach(court => {
        availability[court.id] = {};
        
        console.log(`🏟️ Generating availability for Court ${court.id}:`);
        
        // Generate time slots for business hours (6 AM to 10 PM) in 24-hour format
        for (let hour = 6; hour <= 22; hour++) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
          
          // Check for bookings that conflict with this time slot
          const conflictingBookings = existingBookings.filter(booking => {
            const courtMatch = booking.courtNumber == court.id;
            
            if (!courtMatch) return false;
            
            // Parse times for comparison (handle both HH:MM:SS and HH:MM formats)
            const bookingStart = booking.startTime.substring(0, 5); // "08:00:00" -> "08:00"
            const bookingEnd = booking.endTime.substring(0, 5);
            
            // Extract hours for simple comparison
            const bookingStartHour = parseInt(bookingStart.split(':')[0]);
            const bookingEndHour = parseInt(bookingEnd.split(':')[0]);
            const slotHour = hour;
            
            // Check if this time slot conflicts with the booking
            const conflicts = slotHour >= bookingStartHour && slotHour < bookingEndHour;
            
            if (conflicts) {
              console.log(`🚫 Court ${court.id} at ${timeSlot} conflicts with booking: ${bookingStart}-${bookingEnd}`);
            }
            
            return conflicts;
          });
          
          // Slot is available if no conflicts
          const isAvailable = conflictingBookings.length === 0;
          availability[court.id][timeSlot] = isAvailable;
          
          if (!isAvailable) {
            console.log(`🔴 Court ${court.id} at ${timeSlot} is UNAVAILABLE (${conflictingBookings.length} conflicts)`);
          } else {
            console.log(`🟢 Court ${court.id} at ${timeSlot} is AVAILABLE`);
          }
        }
      });

      console.log('✅ Availability generation complete');

      // Add no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const response = {
        success: true,
        data: {
          facility: {
            id: facility.id,
            name: facility.name
          },
          date,
          availability,
          debug: {
            bookingsFound: existingBookings.length,
            courtsGenerated: Object.keys(availability).length,
            totalSlots: Object.keys(availability).reduce((total, courtId) => {
              return total + Object.keys(availability[courtId]).length;
            }, 0),
            availableSlots: Object.keys(availability).reduce((total, courtId) => {
              return total + Object.values(availability[courtId]).filter(available => available === true).length;
            }, 0),
            version: 'fixed-enum-version',
            facilityFound: true,
            statusValuesUsed: ['pending', 'paid', 'completed'],
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      };

      console.log('📤 Sending response with debug info:', {
        success: response.success,
        facility: response.data.facility.name,
        courtsGenerated: response.data.debug.courtsGenerated,
        totalSlots: response.data.debug.totalSlots,
        availableSlots: response.data.debug.availableSlots,
        bookingsFound: response.data.debug.bookingsFound
      });

      res.json(response);

    } catch (error) {
      console.error('❌ Unexpected error in getAvailability:', error);
      console.error('❌ Error stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error while getting availability',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
};

module.exports = availabilityController;