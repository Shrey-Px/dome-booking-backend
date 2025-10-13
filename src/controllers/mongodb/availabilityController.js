const { Facility, Booking } = require('../../models/mongodb');

const mongoAvailabilityController = {
  getAvailability: async (req, res) => {
    try {
      console.log('📅 Getting availability...');
      console.log('Params:', req.params);
      console.log('Query:', req.query);

      // Support both facilitySlug and facility_id
      const facilitySlug = req.params.facilitySlug || null;
      const facility_id = req.query.facility_id || null;
      const date = req.query.date;

      console.log('📥 Received params:', { facilitySlug, facility_id, date });

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'date is required'
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Date must be in YYYY-MM-DD format'
        });
      }

      // Find facility by slug or ID
      let facility;
      
      if (facilitySlug) {
        console.log('🔍 Looking for facility by slug:', facilitySlug);
        facility = await Facility.findOne({ slug: facilitySlug });
      } else if (facility_id) {
        console.log('🔍 Looking for facility by ID:', facility_id);
        facility = await Facility.findById(facility_id);
      } else {
        return res.status(400).json({
          success: false,
          message: 'facilitySlug or facility_id is required'
        });
      }

      if (!facility) {
        console.log('❌ Facility not found');
        return res.status(404).json({
          success: false,
          message: 'Facility not found'
        });
      }

      console.log('✅ Facility found:', facility.name);
      console.log('🔍 Looking for bookings on', date);

      // Parse the date for MongoDB query
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);

      // Get existing bookings for the date - use facility._id
      const existingBookings = await Booking.getAvailabilityForDate(
        facility._id.toString(),
        queryDate
      );
      
      console.log(`📋 Found ${existingBookings.length} bookings for ${date}`);

      // Generate availability for each court
      const availability = {};
      
      // Use the courts from the facility data
      const courts = facility.courts || [];

      if (courts.length === 0) {
        console.log('⚠️ No courts found in facility');
      }

      courts.forEach(court => {
        availability[court.id] = {};
        
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
            
            return conflicts;
          });
          
          // Slot is available if no conflicts
          const isAvailable = conflictingBookings.length === 0;
          availability[court.id][timeSlot] = isAvailable;
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
            facilityFound: true,
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      };

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
        database: 'MongoDB',
        timestamp: new Date().toISOString()
      });
    }
  }
};

module.exports = mongoAvailabilityController;