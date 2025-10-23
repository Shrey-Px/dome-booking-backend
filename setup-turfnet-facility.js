// File: setup-turfnet-facility.js (create in backend root)

require('dotenv').config();
const mongoose = require('mongoose');
const Facility = require('./src/models/mongodb/Facility');
const Venue = require('./src/models/mongodb/Venue');

async function setupTurfnetFacility() {
  try {
    console.log('🏏 Setting up Turfnet Cricket Academy...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Step 1: Create Venue (for backward compatibility with mobile app)
    const venueData = {
      fullName: 'Turfnet Cricket Academy',
      about: 'Premier cricket training facility in Burlington with 8 professional cricket lanes. Perfect for batting practice, bowling training, and cricket coaching.',
      amenities: [
        'Professional Cricket Lanes',
        'Bowling Machines',
        'Coaching Available',
        'Equipment Rental',
        'Parking Available',
        'Changing Rooms'
      ],
      availableGames: ['Cricket'],
      eMail: 'vendor@turfnetcricket.ca',
      mobileNumber: '9089089088',
      phoneCode: '+1',
      isActive: true,
      isPromoted: false,
      owner_id: '685a8e63a1e45e1eb270c9cb', // Same owner as Vision Badminton
      address: {
        street: '6383 Ontario Street',
        city: 'Burlington',
        province: 'Ontario',
        postCode: 'U3L 0D4',
        country: 'Canada',
        latitude: 43.3255,
        longitude: -79.7990
      },
      operatingHours: {
        monday: { open: '08:00', close: '22:00' },
        tuesday: { open: '08:00', close: '22:00' },
        wednesday: { open: '08:00', close: '22:00' },
        thursday: { open: '08:00', close: '22:00' },
        friday: { open: '08:00', close: '22:00' },
        saturday: { open: '06:00', close: '23:00' },
        sunday: { open: '06:00', close: '23:00' }
      },
      pricePerHour: 45.00,
      courts: [
        { id: 1, name: 'Lane 1', sport: 'Cricket' },
        { id: 2, name: 'Lane 2', sport: 'Cricket' },
        { id: 3, name: 'Lane 3', sport: 'Cricket' },
        { id: 4, name: 'Lane 4', sport: 'Cricket' },
        { id: 5, name: 'Lane 5', sport: 'Cricket' },
        { id: 6, name: 'Lane 6', sport: 'Cricket' },
        { id: 7, name: 'Lane 7', sport: 'Cricket' },
        { id: 8, name: 'Lane 8', sport: 'Cricket' }
      ]
    };

    let venue = await Venue.findOne({ eMail: 'vendor@turfnetcricket.ca' });
    
    if (venue) {
      console.log('✅ Venue already exists, updating...');
      venue = await Venue.findByIdAndUpdate(venue._id, venueData, { new: true });
    } else {
      venue = await Venue.create(venueData);
      console.log('✅ Venue created:', venue._id);
    }

    // Step 2: Create Facility (for web booking platform)
    const facilityData = {
      slug: 'turfnet-cricket',
      venueId: venue._id,
      name: 'Turfnet Cricket Academy',
      description: 'Professional cricket training facility with 8 lanes, bowling machines, and expert coaching.',
      website: 'https://turfnetcricket.ca',
      
      // 8 Cricket Lanes
      courts: [
        { id: 1, name: 'Lane 1', sport: 'Cricket', active: true },
        { id: 2, name: 'Lane 2', sport: 'Cricket', active: true },
        { id: 3, name: 'Lane 3', sport: 'Cricket', active: true },
        { id: 4, name: 'Lane 4', sport: 'Cricket', active: true },
        { id: 5, name: 'Lane 5', sport: 'Cricket', active: true },
        { id: 6, name: 'Lane 6', sport: 'Cricket', active: true },
        { id: 7, name: 'Lane 7', sport: 'Cricket', active: true },
        { id: 8, name: 'Lane 8', sport: 'Cricket', active: true }
      ],
      totalCourts: 8,
      
      // Operating Hours
      operatingHours: {
        weekday: { start: '08:00', end: '22:00' },  // 8 AM - 10 PM
        weekend: { start: '06:00', end: '23:00' }   // 6 AM - 11 PM
      },
      timezone: 'America/Toronto',
      
      // Branding
      branding: {
        primaryColor: '#1E3A8A',      // Deep Blue (Cricket theme)
        secondaryColor: '#10B981',    // Green (Cricket field)
        logoUrl: '',                  // Add later if needed
        faviconUrl: ''                // Add later if needed
      },
      
      // Pricing - Cricket specific
      pricing: {
        courtRental: 45.00,           // $45/hour for cricket lanes
        serviceFeePercentage: 1.0,    // 1%
        taxPercentage: 13.0,          // 13% HST
        currency: 'CAD'
      },
      
      // Contact Information
      contact: {
        email: 'vendor@turfnetcricket.ca',
        phone: '908-908-9088',
        address: {
          street: '6383 Ontario Street',
          city: 'Burlington',
          province: 'Ontario',
          postalCode: 'U3L 0D4',
          country: 'Canada'
        }
      },
      
      // Feature Flags
      features: {
        onlineBooking: true,
        emailNotifications: true,
        cancellations: true,
        discounts: true
      },
      
      active: true,
      createdBy: 'admin',
      lastModified: new Date()
    };

    let facility = await Facility.findOne({ slug: 'turfnet-cricket' });
    
    if (facility) {
      console.log('✅ Facility already exists, updating...');
      facility = await Facility.findByIdAndUpdate(facility._id, facilityData, { new: true });
    } else {
      facility = await Facility.create(facilityData);
      console.log('✅ Facility created:', facility._id);
    }

    console.log('\n🎉 Turfnet Cricket Academy setup complete!');
    console.log('📋 Summary:');
    console.log('   - Venue ID:', venue._id);
    console.log('   - Facility ID:', facility._id);
    console.log('   - Slug: turfnet-cricket');
    console.log('   - URL: https://domeweb.netlify.app/turfnet-cricket');
    console.log('   - Lanes: 8 cricket lanes');
    console.log('   - Pricing: $45/hour');
    console.log('   - Weekday Hours: 8:00 AM - 10:00 PM');
    console.log('   - Weekend Hours: 6:00 AM - 11:00 PM');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the setup
setupTurfnetFacility();