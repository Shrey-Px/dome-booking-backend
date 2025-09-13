const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://Vinay:8ykfADhTRztP4Ydd@dome-cluster.qrmwt.mongodb.net/dome_prod?retryWrites=true&w=majority&appName=Dome-Cluster';

async function simulateMobileQueries() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    const venueId = '685a8c657a7041e6a3022a76';
    
    // Test different ways mobile app might query
    console.log('=== TESTING DIFFERENT QUERY PATTERNS ===\n');
    
    // Pattern 1: ObjectId vs String venue ID
    console.log('1. Testing ObjectId vs String venue queries:');
    
    const stringQuery = await db.collection('Booking').find({
      venue: venueId,
      bookingStatus: 'Booked'
    }).count();
    
    const objectIdQuery = await db.collection('Booking').find({
      venue: new mongoose.Types.ObjectId(venueId),
      bookingStatus: 'Booked'
    }).count();
    
    console.log(`   String venue ID: ${stringQuery} bookings`);
    console.log(`   ObjectId venue ID: ${objectIdQuery} bookings`);
    
    // Pattern 2: Different date range queries
    console.log('\n2. Testing date range queries:');
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Query with exact time ranges
    const exactRange = await db.collection('Booking').find({
      venue: venueId,
      startTime: { $gte: todayStart, $lte: todayEnd },
      bookingStatus: { $in: ['Booked', 'Completed'] }
    }).toArray();
    
    // Query with just date comparison
    const dateOnly = await db.collection('Booking').find({
      venue: venueId,
      bookingDate: { $gte: todayStart, $lte: todayEnd },
      bookingStatus: { $in: ['Booked', 'Completed'] }
    }).toArray();
    
    console.log(`   startTime range: ${exactRange.length} bookings`);
    console.log(`   bookingDate range: ${dateOnly.length} bookings`);
    
    // Pattern 3: Field variations
    console.log('\n3. Testing field name variations:');
    
    const fieldNameCount = await db.collection('Booking').find({
      venue: venueId,
      fieldName: { $exists: true }
    }).count();
    
    const courtNumberCount = await db.collection('Booking').find({
      venue: venueId,
      courtNumber: { $exists: true }
    }).count();
    
    console.log(`   fieldName field: ${fieldNameCount} bookings`);
    console.log(`   courtNumber field: ${courtNumberCount} bookings`);
    
    // Pattern 4: Check for case sensitivity
    console.log('\n4. Testing status case sensitivity:');
    
    const bookedUpper = await db.collection('Booking').find({
      venue: venueId,
      bookingStatus: 'Booked'
    }).count();
    
    const bookedLower = await db.collection('Booking').find({
      venue: venueId,
      bookingStatus: 'booked'
    }).count();
    
    console.log(`   "Booked": ${bookedUpper} bookings`);
    console.log(`   "booked": ${bookedLower} bookings`);
    
    // Pattern 5: Check for additional filters mobile might use
    console.log('\n5. Testing additional mobile app filters:');
    
    const withPlayer = await db.collection('Booking').find({
      venue: venueId,
      player: { $exists: true },
      bookingStatus: 'Booked'
    }).count();
    
    const withoutPlayer = await db.collection('Booking').find({
      venue: venueId,
      player: { $exists: false },
      bookingStatus: 'Booked'
    }).count();
    
    console.log(`   With player field: ${withPlayer} bookings`);
    console.log(`   Without player field: ${withoutPlayer} bookings`);
    
    // Show sample booking for comparison
    console.log('\n6. Sample web booking structure:');
    const webBooking = await db.collection('Booking').findOne({
      source: 'web',
      venue: venueId
    });
    
    const mobileBooking = await db.collection('Booking').findOne({
      source: { $ne: 'web' },
      venue: venueId
    });
    
    console.log('Web booking fields:');
    if (webBooking) {
      Object.keys(webBooking).forEach(key => {
        console.log(`   ${key}: ${typeof webBooking[key]}`);
      });
    }
    
    console.log('\nMobile booking fields:');
    if (mobileBooking) {
      Object.keys(mobileBooking).forEach(key => {
        console.log(`   ${key}: ${typeof mobileBooking[key]}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

simulateMobileQueries();