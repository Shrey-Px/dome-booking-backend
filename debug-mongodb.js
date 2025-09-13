const mongoose = require('mongoose');

// Use your existing MongoDB connection string
const MONGODB_URI = 'mongodb+srv://Vinay:8ykfADhTRztP4Ydd@dome-cluster.qrmwt.mongodb.net/dome_prod?retryWrites=true&w=majority&appName=Dome-Cluster';

async function debugMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections found:');
    collections.forEach(col => console.log('-', col.name));
    
    // Check Booking collection
    console.log('\n=== BOOKING ANALYSIS ===');
    
    const bookingCount = await db.collection('Booking').countDocuments();
    console.log('Total bookings:', bookingCount);
    
    // Count by source
    const sourceCount = await db.collection('Booking').aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\nBookings by source:');
    sourceCount.forEach(item => console.log(`- ${item._id}: ${item.count}`));
    
    // Recent bookings
    const recentBookings = await db.collection('Booking').find({
      startTime: { 
        $gte: new Date(new Date().setDate(new Date().getDate() - 7))
      }
    }).sort({ startTime: -1 }).limit(5).toArray();
    
    console.log('\nRecent bookings:');
    recentBookings.forEach(booking => {
      console.log(`- ${booking.fieldName || booking.courtNumber} at ${booking.startTime} (${booking.source || 'unknown source'})`);
    });
    
    // Sample booking structure
    const sampleBooking = await db.collection('Booking').findOne();
    console.log('\nSample booking structure:');
    console.log(Object.keys(sampleBooking));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugMongoDB();