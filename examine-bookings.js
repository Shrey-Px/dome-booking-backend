// examine-bookings-fixed.js
require('dotenv').config();
const mongoose = require('mongoose');

async function examineBookings() {
  try {
    // Use your direct connection string
    const connectionString = 'mongodb+srv://Vinay:8ykfADhTRztP4Ydd@dome-cluster.qrmwt.mongodb.net/dome_prod?retryWrites=true&w=majority&appName=Dome-Cluster';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(connectionString);
    console.log('Connected successfully');
    
    const db = mongoose.connection.db;
    
    // First, get a count
    const bookingCount = await db.collection('Booking').countDocuments();
    console.log(`Total bookings in dome_prod.Booking: ${bookingCount}`);
    
    // Get sample bookings
    const bookings = await db.collection('Booking').find({}).limit(3).toArray();
    
    console.log('\nSample bookings from dome_prod.Booking:');
    bookings.forEach((booking, i) => {
      console.log(`\n--- Booking ${i + 1} ---`);
      console.log(`ID: ${booking._id}`);
      console.log(`Created: ${booking.createdAt || 'N/A'}`);
      
      // Show all fields in the booking
      Object.keys(booking).forEach(key => {
        if (key !== '_id') {
          const value = booking[key];
          if (typeof value === 'object' && value !== null) {
            console.log(`${key}: ${JSON.stringify(value, null, 2)}`);
          } else {
            console.log(`${key}: ${value}`);
          }
        }
      });
      console.log('---');
    });
    
    // Also check for any bookings with source: 'web' (your test booking)
    const webBookings = await db.collection('Booking').find({ source: 'web' }).toArray();
    console.log(`\nWeb bookings found: ${webBookings.length}`);
    
    if (webBookings.length > 0) {
      console.log('Your web booking:');
      console.log(JSON.stringify(webBookings[0], null, 2));
    }
    
    await mongoose.connection.close();
    console.log('\nConnection closed');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

examineBookings();