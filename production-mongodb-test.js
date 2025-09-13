// production-mongodb-test.js - Test script for production MongoDB connection
require('dotenv').config();
const { connectMongoDB, mongoose } = require('./src/config/mongodb');

async function testProductionConnection() {
  try {
    console.log('Starting Production MongoDB connection test...\n');
    
    // Connect to production MongoDB
    await connectMongoDB();
    
    console.log('1. Testing connection to production database...');
    console.log('Connection successful!\n');
    
    // Import production models
    const Venue = require('./src/models/mongodb/Venue');
    const Booking = require('./src/models/mongodb/ProductionBooking');
    
    console.log('2. Testing venue lookup...');
    
    // Find the specific venue from your production database
    const targetVenueId = '685a8c657a7041e6a3022a76';
    console.log(`Looking for venue: ${targetVenueId}`);
    
    const venue = await Venue.findById(targetVenueId);
    
    if (venue) {
      console.log('Venue found:', venue.fullName);
      console.log('Address:', venue.getFullAddress());
      console.log('Email:', venue.eMail);
      console.log('Phone:', venue.phoneCode + venue.mobileNumber);
      console.log('Active:', venue.isActive);
      console.log('Available Games:', venue.availableGames);
      console.log('Operating Hours:', venue.operatingHours || 'Not set - using defaults');
      
      // Update operating hours if not set
      if (!venue.operatingHours) {
        console.log('\n3. Setting operating hours...');
        venue.operatingHours = {
          monday: { open: '08:00', close: '20:00' },
          tuesday: { open: '08:00', close: '20:00' },
          wednesday: { open: '08:00', close: '20:00' },
          thursday: { open: '08:00', close: '20:00' },
          friday: { open: '08:00', close: '20:00' },
          saturday: { open: '06:00', close: '22:00' },
          sunday: { open: '06:00', close: '22:00' }
        };
        venue.pricePerHour = 1.00;
        
        await venue.save();
        console.log('Operating hours and price updated');
      }
      
      // Check for existing bookings
      console.log('\n4. Checking existing bookings...');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysBookings = await Booking.find({
        venue_id: venue._id,
        bookingDate: { $gte: today }
      }).limit(5);
      
      console.log(`Found ${todaysBookings.length} upcoming bookings:`);
      todaysBookings.forEach((booking, index) => {
        console.log(`  ${index + 1}. ${booking.customerName} - Court ${booking.courtNumber} - ${booking.bookingDate.toDateString()} ${booking.startTime}-${booking.endTime} - Status: ${booking.status}`);
      });
      
      // Test availability calculation
      console.log('\n5. Testing availability calculation...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const tomorrowBookings = await Booking.getAvailabilityForDate(venue._id, tomorrow);
      console.log(`Tomorrow (${tomorrow.toDateString()}) has ${tomorrowBookings.length} bookings`);
      
      // Test day of week calculation
      const dayOfWeek = tomorrow.getDay();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[dayOfWeek];
      const operatingHours = venue.operatingHours[dayName];
      
      console.log(`Tomorrow is ${dayName}, operating hours: ${operatingHours.open} - ${operatingHours.close}`);
      
    } else {
      console.log('Venue not found with ID:', targetVenueId);
      console.log('\nListing all venues in the database:');
      
      const allVenues = await Venue.find({}).limit(10);
      if (allVenues.length === 0) {
        console.log('No venues found in the Venue collection');
        
        // Check if we're using the wrong collection name
        console.log('\nLet\'s check what collections exist in this database...');
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Available collections:');
        collections.forEach((collection, index) => {
          console.log(`${index + 1}. ${collection.name}`);
        });
        
        // Try to find documents in common collection names
        const commonNames = ['venues', 'Venues', 'venue', 'facilities', 'Facility'];
        for (const collectionName of commonNames) {
          try {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            console.log(`Collection "${collectionName}": ${count} documents`);
            
            if (count > 0) {
              const samples = await collection.find({}).limit(3).toArray();
              console.log(`Sample documents from "${collectionName}":`);
              samples.forEach((doc, i) => {
                console.log(`  ${i + 1}. ID: ${doc._id}, Name: ${doc.fullName || doc.name || 'N/A'}`);
              });
            }
          } catch (e) {
            // Collection doesn't exist, skip
          }
        }
      } else {
        allVenues.forEach((v, index) => {
          console.log(`${index + 1}. ${v._id} - ${v.fullName} - Active: ${v.isActive}`);
        });
      }
    }
    
    console.log('\n✅ Production MongoDB test completed successfully!');
    
    if (venue) {
      console.log('\nYou can now test the production availability endpoint:');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      console.log(`GET /api/v1/availability?facility_id=${targetVenueId}&date=${dateStr}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Production MongoDB test failed:', error);
    console.error('Error details:', error.message);
    
    if (error.name === 'MongoNetworkError') {
      console.error('\nConnection issue. Please check:');
      console.error('1. Your MongoDB connection string in .env');
      console.error('2. Network access whitelist in MongoDB Atlas');
      console.error('3. Username and password are correct');
    }
    
    process.exit(1);
  }
}

console.log('🚀 Starting Production MongoDB connection test...\n');
testProductionConnection();