const mongoose = require('mongoose');

// Use your existing MongoDB connection string
const MONGODB_URI = 'mongodb+srv://Vinay:8ykfADhTRztP4Ydd@dome-cluster.qrmwt.mongodb.net/dome_prod?retryWrites=true&w=majority&appName=Dome-Cluster';

async function checkMobileSync() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const venueId = '68ac6858af5c4d97311377c3';
    
    // Check today's date in different formats
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    console.log('\n=== MOBILE APP VISIBILITY CHECK ===');
    console.log('Checking for venue:', venueId);
    console.log('Date range:', todayStart, 'to', todayEnd);
    
    // Query exactly how mobile app would query
    const mobileQuery = {
      venue: venueId,
      startTime: { 
        $gte: todayStart, 
        $lte: todayEnd 
      },
      bookingStatus: { $in: ['Booked', 'Completed'] }
    };
    
    const mobileBookings = await db.collection('Booking').find(mobileQuery).toArray();
    
    console.log('\nBookings mobile app should see today:');
    console.log('Query used:', JSON.stringify(mobileQuery, null, 2));
    console.log('Results found:', mobileBookings.length);
    
    mobileBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ${booking.fieldName} at ${booking.startTime.toLocaleString()} (${booking.source || 'mobile'})`);
    });
    
    // Check if there are bookings with different date formats
    console.log('\n=== CHECKING DATE FORMATS ===');
    
    const allBookings = await db.collection('Booking').find({ venue: venueId }).limit(10).toArray();
    
    allBookings.forEach((booking, index) => {
      console.log(`Booking ${index + 1}:`);
      console.log(`  startTime type: ${typeof booking.startTime} | value: ${booking.startTime}`);
      console.log(`  bookingDate type: ${typeof booking.bookingDate} | value: ${booking.bookingDate}`);
      console.log(`  bookingStatus: ${booking.bookingStatus}`);
      console.log(`  source: ${booking.source}`);
      console.log('---');
    });
    
    // Check for any sync or version fields
    console.log('\n=== SYNC STATUS CHECK ===');
    const syncFields = await db.collection('Booking').findOne({}, {
      syncedAt: 1,
      version: 1, 
      mobileBookingId: 1,
      updatedAt: 1,
      createdAt: 1
    });
    
    console.log('Sync-related fields found:', syncFields);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkMobileSync();