const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://Vinay:oRR1TJfyJq2mMH9t@dome-cluster.qrmwt.mongodb.net/dome_prod?retryWrites=true&w=majority&appName=Dome-Cluster';

async function realTimeSyncTest() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for real-time monitoring...');
    
    const db = mongoose.connection.db;
    const venueId = '685a8c657a7041e6a3022a76';
    
    // Get current booking count
    const currentCount = await db.collection('Booking').countDocuments({
      venue: venueId
    });
    
    console.log(`Current total bookings for venue: ${currentCount}`);
    console.log('Waiting for new bookings... (make a test booking now)');
    console.log('Press Ctrl+C to exit');
    
    // Watch for changes in real-time
    const changeStream = db.collection('Booking').watch([
      { $match: { 'fullDocument.venue': venueId } }
    ]);
    
    changeStream.on('change', (change) => {
      console.log('\n🔄 BOOKING CHANGE DETECTED:');
      console.log('Operation:', change.operationType);
      
      if (change.fullDocument) {
        const booking = change.fullDocument;
        console.log('Booking details:');
        console.log(`- Court: ${booking.fieldName}`);
        console.log(`- Start time: ${booking.startTime}`);
        console.log(`- Status: ${booking.bookingStatus}`);
        console.log(`- Source: ${booking.source}`);
        console.log(`- Payment status: ${booking.paymentIntentStatus}`);
      }
      
      if (change.updateDescription) {
        console.log('Fields updated:', Object.keys(change.updateDescription.updatedFields));
      }
    });
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\nClosing change stream...');
      await changeStream.close();
      await mongoose.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

realTimeSyncTest();