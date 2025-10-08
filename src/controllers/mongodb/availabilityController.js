// src/controllers/mongodb/availabilityController.js
const { Facility, Booking } = require('../../models/mongodb');

const mongoAvailabilityController = {
  getAvailability: async (req, res) => {
    try {
      // console.log('📅 [MongoDB] Getting availability...');
      // console.log('Query params:', req.query);

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
        // console.log('❌ Invalid date format:', date);
        return res.status(400).json({
          success: false,
          message: 'Date must be in YYYY-MM-DD format',
          received: date
        });
      }

      // console.log(`🔍 [MongoDB] Looking for facility: ${facility_id}`);

      // Check if facility exists
      let facility;
      try {
        facility = await Facility.findById(facility_id);
        // console.log('🏢 [MongoDB] Facility query result:', facility ? 'Found' : 'Not found');
        
        if (!facility) {
          // console.log('❌ [MongoDB] Facility not found in database');
          return res.status(404).json({
            success: false,
            message: 'Facility not found',
            facilityId: facility_id,
            database: 'MongoDB'
          });
        }
      } catch (dbError) {
        console.error('❌ [MongoDB] Database error while finding facility:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error while finding facility',
          error: dbError.message,
          database: 'MongoDB'
        });
      }

      // console.log(`🔍 [MongoDB] Looking for bookings on ${date}...`);

      // Parse the date for MongoDB query
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);

      // Get existing bookings for the date
      let existingBookings;
      try {
        existingBookings = await Booking.getAvailabilityForDate(facility_id, queryDate);
        
        // console.log(`📋 [MongoDB] Found ${existingBookings.length} bookings for ${date}`);
        
        // Log booking details for debugging
        existingBookings.forEach((booking, index) => {
          // console.log(`📋 [MongoDB] Booking ${index + 1}: Court ${booking.courtNumber}, ${booking.startTime}-${booking.endTime}, Status: ${booking.status}, Customer: ${booking.customerName}`);
        });
        
      } catch (dbError) {
        console.error('❌ [MongoDB] Database error while finding bookings:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error while finding bookings',
          error: dbError.message,
          database: 'MongoDB'
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
        
        // console.log(`🏟️ [MongoDB] Generating availability for Court ${court.id}:`);
        
        // Generate time slots for business hours (6 AM to 10 PM)
        for (let hour = 6; hour <= 22; hour++) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
          
          // Check for bookings that conflict with this time slot
          const conflictingBookings = existingBookings.filter(booking => {
            const courtMatch = booking.courtNumber == court.id;
            
            if (!courtMatch) return false;
            
            // Parse times for comparison
            const bookingStart = booking.startTime;
            const bookingEnd = booking.endTime;
            
            // Extract hours for comparison
            const bookingStartHour = parseInt(bookingStart.split(':')[0]);
            const bookingEndHour = parseInt(bookingEnd.split(':')[0]);
            const slotHour = hour;
            
            // Check if this time slot conflicts with the booking
            const conflicts = slotHour >= bookingStartHour && slotHour < bookingEndHour;
            
            if (conflicts) {
              // console.log(`🚫 [MongoDB] Court ${court.id} at ${timeSlot} conflicts with booking: ${bookingStart}-${bookingEnd}`);
            }
            
            return conflicts;
          });
          
          // Slot is available if no conflicts
          const isAvailable = conflictingBookings.length === 0;
          availability[court.id][timeSlot] = isAvailable;
          
          if (!isAvailable) {
            // console.log(`🔴 [MongoDB] Court ${court.id} at ${timeSlot} is UNAVAILABLE (${conflictingBookings.length} conflicts)`);
          } else {
            // console.log(`🟢 [MongoDB] Court ${court.id} at ${timeSlot} is AVAILABLE`);
          }
        }
      });

      // console.log('✅ [MongoDB] Availability generation complete');

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
            id: facility._id,
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
            database: 'MongoDB',
            version: 'mongodb-version',
            facilityFound: true,
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      };

      // console.log('📤 [MongoDB] Sending response with debug info:', {
        success: response.success,
        facility: response.data.facility.name,
        courtsGenerated: response.data.debug.courtsGenerated,
        totalSlots: response.data.debug.totalSlots,
        availableSlots: response.data.debug.availableSlots,
        bookingsFound: response.data.debug.bookingsFound,
        database: 'MongoDB'
      });

      res.json(response);

    } catch (error) {
      console.error('❌ [MongoDB] Unexpected error in getAvailability:', error);
      console.error('❌ [MongoDB] Error stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error while getting availability',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Internal server error',
        database: 'MongoDB',
        timestamp: new Date().toISOString()
      });
    }
  }
};

module.exports = mongoAvailabilityController;