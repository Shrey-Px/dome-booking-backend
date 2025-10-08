// src/controllers/mongodb/productionAvailabilityController.js - Complete Fixed Version with ObjectId compatibility
const Venue = require('../../models/mongodb/Venue');
const { ObjectId } = require('mongodb');

const productionAvailabilityController = {
  getAvailability: async (req, res) => {
    try {
      // console.log('[Production MongoDB] Getting availability...');
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
        // console.log('Invalid date format:', date);
        return res.status(400).json({
          success: false,
          message: 'Date must be in YYYY-MM-DD format',
          received: date
        });
      }

      // console.log(`[Production MongoDB] Looking for venue: ${facility_id}`);

      // Check if venue exists
      const venue = await Venue.findById(facility_id);
      if (!venue) {
        // console.log('[Production MongoDB] Venue not found in database');
        return res.status(404).json({
          success: false,
          message: 'Venue not found',
          facilityId: facility_id,
          database: 'Production MongoDB'
        });
      }

      // console.log(`[Production MongoDB] Found venue: ${venue.fullName}`);

      // Parse date properly to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number);
      const dayStart = new Date(year, month - 1, day, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59);

      // console.log(`[Production MongoDB] Searching for bookings between:`, {
      //  start: dayStart.toISOString(),
      //  end: dayEnd.toISOString()
      // });

      // FIXED: Get existing bookings for the date using corrected MongoDB query that handles both ObjectId and string venue formats
      const db = require('mongoose').connection.db;
      
      const existingBookings = await db.collection('Booking').find({
        $and: [
          // FIXED: Search for both string and ObjectId venue formats
          {
            $or: [
              { venue: facility_id }, // String format (web bookings)
              { venue: new ObjectId(facility_id) } // ObjectId format (mobile bookings)
            ]
          },
          {
            $or: [
              // Mobile schema bookings (startTime as Date)
              {
                startTime: { $gte: dayStart, $lte: dayEnd },
                bookingStatus: { $in: ['Booked', 'Completed'] }
              },
              // Old web schema bookings (bookingDate as Date)
              {
                bookingDate: { $gte: dayStart, $lte: dayEnd },
                status: { $in: ['pending', 'paid', 'completed'] }
              }
            ]
          }
        ]
      }).sort({ startTime: 1 }).toArray();

      // console.log(`[Production MongoDB] Found ${existingBookings.length} bookings for ${date}`);
      
      // Log booking details for debugging
      existingBookings.forEach((booking, index) => {
        const courtInfo = booking.fieldName || `Court ${booking.courtNumber}`;
        const timeInfo = booking.startTime instanceof Date 
          ? `${booking.startTime.getHours().toString().padStart(2, '0')}:${booking.startTime.getMinutes().toString().padStart(2, '0')}-${booking.endTime.getHours().toString().padStart(2, '0')}:${booking.endTime.getMinutes().toString().padStart(2, '0')}`
          : `${booking.startTime}-${booking.endTime}`;
        const status = booking.bookingStatus || booking.status;
        const customer = booking.customerName || 'Customer';
        const source = booking.source || 'mobile';
        
        // console.log(`[Production MongoDB] Booking ${index + 1}: ${courtInfo}, ${timeInfo}, Status: ${status}, Customer: ${customer}, Source: ${source}`);
      });

      // FIXED: Get operating hours for the correct day with proper hours
      const dayOfWeek = dayStart.getDay();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[dayOfWeek];
      
      // FIXED: Strings Badminton Academy operating hours
      // Weekday (Mon-Fri): 08:00-20:00, Weekend (Sat-Sun): 06:00-22:00
      let operatingHours;
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Monday to Friday
        operatingHours = { open: '08:00', close: '20:00' };
      } else {
        // Saturday and Sunday
        operatingHours = { open: '06:00', close: '22:00' };
      }

      // console.log(`Operating hours for ${dayName}:`, operatingHours);

      // Generate availability for each court
      const availability = {};
      
      // FIXED: Strings Badminton Academy has 10 courts (not 2)
      const courts = [];
      for (let i = 1; i <= 10; i++) {
        courts.push({ id: i, name: `Court ${i}`, sport: 'Badminton' });
      }

      courts.forEach(court => {
        availability[court.id] = {};
        
        // console.log(`[Production MongoDB] Generating availability for Court ${court.id}:`);
        
        // Parse operating hours
        const openHour = parseInt(operatingHours.open.split(':')[0]);
        const closeHour = parseInt(operatingHours.close.split(':')[0]);
        
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
              // Old web format
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
              // Old web format with time strings
              bookingStartHour = parseInt(booking.startTime.split(':')[0]);
              bookingEndHour = parseInt(booking.endTime.split(':')[0]);
            } else {
              return false;
            }
            
            // Check if this time slot conflicts with the booking
            const conflicts = hour >= bookingStartHour && hour < bookingEndHour;
            
            if (conflicts) {
              // console.log(`[Production MongoDB] Court ${court.id} at ${timeSlot} conflicts with booking: ${bookingStartHour}:00-${bookingEndHour}:00 (${booking.source || 'mobile'})`);
            }
            
            return conflicts;
          });
          
          // Slot is available if no conflicts
          const isAvailable = conflictingBookings.length === 0;
          availability[court.id][timeSlot] = isAvailable;
          
          if (!isAvailable) {
            const conflictingSources = conflictingBookings.map(b => b.source || 'mobile').join(', ');
            // console.log(`[Production MongoDB] Court ${court.id} at ${timeSlot} is UNAVAILABLE (${conflictingBookings.length} conflicts from: ${conflictingSources})`);
          } else {
            // console.log(`[Production MongoDB] Court ${court.id} at ${timeSlot} is AVAILABLE`);
          }
        }
      });

      // console.log('[Production MongoDB] Availability generation complete');

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
            id: venue._id,
            name: venue.fullName,
            address: venue.getFullAddress ? venue.getFullAddress() : 'Address not available',
            pricePerHour: venue.pricePerHour || 1.00,
            operatingHours: operatingHours,
            totalCourts: 10
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
            bookingsBySource: {
              web: existingBookings.filter(b => b.source === 'web').length,
              mobile: existingBookings.filter(b => !b.source || b.source !== 'web').length
            },
            database: 'Production MongoDB',
            venue: venue.fullName,
            operatingHours: operatingHours,
            dayOfWeek: dayName,
            searchPeriod: {
              start: dayStart.toISOString(),
              end: dayEnd.toISOString()
            },
            version: 'production-mongodb-objectid-compatible-v3-10courts',
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      };

      // console.log('[Production MongoDB] Sending response:', {
      //  success: response.success,
      //  venue: response.data.facility.name,
      //  courtsGenerated: response.data.debug.courtsGenerated,
      //  totalSlots: response.data.debug.totalSlots,
      //  availableSlots: response.data.debug.availableSlots,
      //  bookingsFound: response.data.debug.bookingsFound,
      //  webBookings: response.data.debug.bookingsBySource.web,
      //  mobileBookings: response.data.debug.bookingsBySource.mobile,
      //  database: 'Production MongoDB'
      // });

      res.json(response);

    } catch (error) {
      console.error('[Production MongoDB] Unexpected error in getAvailability:', error);
      console.error('[Production MongoDB] Error stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error while getting availability',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Internal server error',
        database: 'Production MongoDB',
        timestamp: new Date().toISOString()
      });
    }
  }
};

module.exports = productionAvailabilityController;