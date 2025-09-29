// src/controllers/mongodb/tenantAvailabilityController.js
const { ObjectId } = require('mongodb');

const tenantAvailabilityController = {
  getAvailability: async (req, res) => {
    try {
      console.log('[Tenant Availability] Getting availability...');
      console.log('Query params:', req.query);
      console.log('Facility:', req.facility?.name);

      const { date } = req.query;
      const facility = req.facility;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date parameter is required',
          received: { date }
        });
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Date must be in YYYY-MM-DD format',
          received: date
        });
      }

      console.log(`[Tenant Availability] Facility: ${facility.name} (${facility.slug})`);

      // Parse date properly to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number);
      const dayStart = new Date(year, month - 1, day, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59);

      console.log(`[Tenant Availability] Searching for bookings between:`, {
        start: dayStart.toISOString(),
        end: dayEnd.toISOString(),
        facilityId: facility.venueId
      });

      // Get existing bookings for the date using facility's venue ID
      const db = require('mongoose').connection.db;
      
      const existingBookings = await db.collection('Booking').find({
        $and: [
          // Search using facility's venue ID
          {
            $or: [
              { venue: facility.venueId.toString() },
              { venue: new ObjectId(facility.venueId) }
            ]
          },
          {
            $or: [
              // Mobile schema bookings (startTime as Date)
              {
                startTime: { $gte: dayStart, $lte: dayEnd },
                bookingStatus: { $in: ['Booked', 'Completed'] }
              },
              // Web schema bookings (bookingDate as Date)
              {
                bookingDate: { $gte: dayStart, $lte: dayEnd },
                status: { $in: ['pending', 'paid', 'completed'] }
              }
            ]
          }
        ]
      }).sort({ startTime: 1 }).toArray();

      console.log(`[Tenant Availability] Found ${existingBookings.length} bookings for ${date}`);

      // Get operating hours for the correct day using facility configuration
      const dayOfWeek = dayStart.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const operatingHours = facility.getOperatingHours(isWeekend);

      console.log(`Operating hours for ${isWeekend ? 'weekend' : 'weekday'}:`, operatingHours);

      // Generate availability for each court using facility configuration
      const availability = {};
      
      facility.courts.forEach(court => {
        if (!court.active) return; // Skip inactive courts
        
        availability[court.id] = {};
        
        console.log(`[Tenant Availability] Generating availability for ${court.name}:`);
        
        // Parse operating hours
        const openHour = parseInt(operatingHours.start.split(':')[0]);
        const closeHour = parseInt(operatingHours.end.split(':')[0]);
        
        // Generate time slots within operating hours
        for (let hour = openHour; hour < closeHour; hour++) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
          
          // Check for bookings that conflict with this time slot
          const conflictingBookings = existingBookings.filter(booking => {
            // Match court
            let courtMatch = false;
            if (booking.fieldName) {
              // Mobile format: "Court 1", "Court 2", etc.
              const courtNum = parseInt(booking.fieldName.replace('Court ', ''));
              courtMatch = courtNum === court.id;
            } else if (booking.courtNumber) {
              // Web format
              courtMatch = booking.courtNumber === court.id;
            }
            
            if (!courtMatch) return false;
            
            // Check time overlap
            let bookingStartHour, bookingEndHour;
            
            if (booking.startTime instanceof Date && booking.endTime instanceof Date) {
              // Mobile format with Date objects
              bookingStartHour = booking.startTime.getHours();
              bookingEndHour = booking.endTime.getHours();
            } else if (typeof booking.startTime === 'string' && typeof booking.endTime === 'string') {
              // Web format with time strings
              bookingStartHour = parseInt(booking.startTime.split(':')[0]);
              bookingEndHour = parseInt(booking.endTime.split(':')[0]);
            } else {
              return false;
            }
            
            // Check if this time slot conflicts with the booking
            return hour >= bookingStartHour && hour < bookingEndHour;
          });
          
          // Slot is available if no conflicts
          availability[court.id][timeSlot] = conflictingBookings.length === 0;
        }
      });

      console.log('[Tenant Availability] Availability generation complete');

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
            id: facility.venueId,
            slug: facility.slug,
            name: facility.name,
            address: facility.getFullAddress(),
            pricePerHour: facility.pricing.courtRental,
            operatingHours: operatingHours,
            totalCourts: facility.totalCourts,
            branding: facility.branding
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
            facilitySlug: facility.slug,
            venueId: facility.venueId,
            operatingHours: operatingHours,
            dayOfWeek: isWeekend ? 'weekend' : 'weekday',
            version: 'tenant-aware-v1',
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('[Tenant Availability] Unexpected error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error while getting availability',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
};

module.exports = tenantAvailabilityController;