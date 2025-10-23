// src/controllers/mongodb/productionAvailabilityController.js - Updated for 24 Courts Multi-Sport
const Venue = require('../../models/mongodb/Venue');
const Facility = require('../../models/mongodb/Facility');
const { ObjectId } = require('mongodb');

const productionAvailabilityController = {
  getAvailability: async (req, res) => {
    try {
      const { date } = req.query;
      
      // Get facility from middleware (tenant context)
      const facility = req.facility;
      const venueId = req.venueId;

      console.log('[Availability] Request received:', {
        date,
        facilitySlug: facility?.slug,
        venueId: venueId?.toString()
      });

      if (!facility || !venueId) {
        return res.status(400).json({
          success: false,
          message: 'Facility context missing',
          hint: 'TenantMiddleware should have resolved facility'
        });
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date parameter is required',
          hint: 'Provide date in YYYY-MM-DD format'
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

      console.log('[Availability] Using facility:', {
        name: facility.name,
        slug: facility.slug,
        totalCourts: facility.totalCourts,
        courtsConfigured: facility.courts?.length || 0
      });

      // Verify venue exists
      const venue = await Venue.findById(venueId);
      if (!venue) {
        return res.status(404).json({
          success: false,
          message: 'Venue not found',
          venueId: venueId.toString()
        });
      }

      // Parse date properly to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number);
      const dayStart = new Date(year, month - 1, day, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59);

      console.log('[Availability] Searching bookings between:', {
        start: dayStart.toISOString(),
        end: dayEnd.toISOString()
      });

      // Get existing bookings for the date (both ObjectId and string venue formats)
      const db = require('mongoose').connection.db;
      
      const existingBookings = await db.collection('Booking').find({
        $and: [
          {
            $or: [
              { venue: venueId.toString() },
              { venue: new ObjectId(venueId) }
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
          }
        ]
      }).sort({ startTime: 1 }).toArray();

      console.log('[Availability] Found bookings:', existingBookings.length);

      // Get operating hours for the correct day
      const dayOfWeek = dayStart.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      let operatingHours;
      if (facility.operatingHours) {
        operatingHours = isWeekend 
          ? facility.operatingHours.weekend 
          : facility.operatingHours.weekday;
      } else {
        // Fallback to default hours
        operatingHours = isWeekend 
          ? { start: '06:00', end: '22:00' }
          : { start: '08:00', end: '20:00' };
      }

      console.log('[Availability] Operating hours:', {
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        isWeekend,
        hours: operatingHours
      });

      // Get courts from facility (supports 24 courts with multi-sport)
      const courts = facility.courts || [];
      
      if (courts.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'No courts configured for this facility',
          hint: 'Please configure courts in the facility settings'
        });
      }

      console.log('[Availability] Courts configured:', {
        total: courts.length,
        badminton: courts.filter(c => c.sport === 'Badminton').length,
        pickleball: courts.filter(c => c.sport === 'Pickleball').length
      });

      // Generate availability for each court
      const availability = {};
      
      courts.forEach(court => {
        if (!court.active) {
          console.log(`[Availability] Skipping inactive court: ${court.name}`);
          return;
        }

        availability[court.id] = {};
        
        // Parse operating hours
        const openHour = parseInt(operatingHours.start.split(':')[0]);
        const closeHour = parseInt(operatingHours.end.split(':')[0]);
        
        // Generate time slots within operating hours
        for (let hour = openHour; hour < closeHour; hour++) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
          
          // Check for bookings that conflict with this time slot
          const conflictingBookings = existingBookings.filter(booking => {
            // Match court/lane - handle all formats
            let courtMatch = false;
            if (booking.fieldName) {
              // Mobile/vendor format: "Court 1", "Court P1", "Lane 1", etc.
              const bookingCourtName = booking.fieldName.toLowerCase();
              const courtName = court.name.toLowerCase();

              // Direct match (handles "Lane 1" === "Lane 1")
              if (bookingCourtName === courtName) {
                courtMatch = true;
              }
              // Handle "Court 23" matching "Court P1"
              else if (court.id === 23 && (bookingCourtName === 'court 23' || bookingCourtName === 'court p1')) {
                courtMatch = true;
              }
              else if (court.id === 24 && (bookingCourtName === 'court 24' || bookingCourtName === 'court p2')) {
                courtMatch = true;
              }
              // ✅ NEW: Handle "Lane 1" matching court id 1 for cricket
              else if (bookingCourtName === `lane ${court.id}`) {
                courtMatch = true;
              }
              // Handle numeric court matching
              else if (bookingCourtName === `court ${court.id}`) {
                courtMatch = true;
              }
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
              // Web format with time strings
              bookingStartHour = parseInt(booking.startTime.split(':')[0]);
              bookingEndHour = parseInt(booking.endTime.split(':')[0]);
            } else if (booking.startTimeString && booking.endTimeString) {
              // Vendor format with string fields
              bookingStartHour = parseInt(booking.startTimeString.split(':')[0]);
              bookingEndHour = parseInt(booking.endTimeString.split(':')[0]);
            } else {
              return false;
            }
            
            // Check if this time slot conflicts with the booking
            return hour >= bookingStartHour && hour < bookingEndHour;
          });
          
          // Slot is available if no conflicts
          const isAvailable = conflictingBookings.length === 0;
          availability[court.id][timeSlot] = isAvailable;
        }
      });

      console.log('[Availability] Generation complete:', {
        courtsProcessed: Object.keys(availability).length,
        totalSlots: Object.values(availability).reduce((sum, slots) => sum + Object.keys(slots).length, 0),
        availableSlots: Object.values(availability).reduce((sum, slots) => {
          return sum + Object.values(slots).filter(v => v === true).length;
        }, 0)
      });

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
            slug: facility.slug,
            name: facility.name,
            venueId: venueId.toString(),
            totalCourts: courts.length,
            courts: courts.map(court => ({
              id: court.id,
              name: court.name,
              sport: court.sport,
              active: court.active
            })),
            operatingHours: operatingHours,
            pricing: {
              badminton: 25.00,
              pickleball: 30.00,
              serviceFeePercentage: facility.pricing?.serviceFeePercentage || 1.0,
              taxPercentage: facility.pricing?.taxPercentage || 13.0,
              currency: facility.pricing?.currency || 'CAD'
            }
          },
          date,
          availability,
          debug: {
            bookingsFound: existingBookings.length,
            courtsGenerated: Object.keys(availability).length,
            totalSlots: Object.values(availability).reduce((sum, slots) => sum + Object.keys(slots).length, 0),
            availableSlots: Object.values(availability).reduce((sum, slots) => {
              return sum + Object.values(slots).filter(v => v === true).length;
            }, 0),
            bookingsBySource: {
              web: existingBookings.filter(b => b.source === 'web').length,
              mobile: existingBookings.filter(b => !b.source || b.source !== 'web').length,
              vendor: existingBookings.filter(b => b.isBookedByVendor === true).length
            },
            database: 'Production MongoDB',
            operatingHours: operatingHours,
            dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
            version: 'multi-sport-24-courts-v1',
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('[Availability] Error:', error);
      
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