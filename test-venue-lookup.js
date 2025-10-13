require('dotenv').config();
const mongoose = require('mongoose');

async function testVenueLookup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Direct MongoDB query
    const venueById = await db.collection('Venue').findOne({
      _id: new mongoose.Types.ObjectId('68cad6b20a06da55dfb88af5')
    });
    
    console.log('\n📋 Direct MongoDB query by _id:');
    console.log(venueById ? `✅ Found: ${venueById.fullName}` : '❌ Not found');
    
    const venueBySlug = await db.collection('Venue').findOne({
      slug: 'vision-badminton'
    });
    
    console.log('\n📋 Direct MongoDB query by slug:');
    console.log(venueBySlug ? `✅ Found: ${venueBySlug.fullName}` : '❌ Not found');
    
    // Try with Mongoose model
    const Venue = require('./src/models/mongodb/Venue');
    
    const venueModelById = await Venue.findById('68cad6b20a06da55dfb88af5');
    console.log('\n📋 Mongoose model query by ID:');
    console.log(venueModelById ? `✅ Found: ${venueModelById.fullName}` : '❌ Not found');
    
    const venueModelBySlug = await Venue.findOne({ slug: 'vision-badminton' });
    console.log('\n📋 Mongoose model query by slug:');
    console.log(venueModelBySlug ? `✅ Found: ${venueModelBySlug.fullName}` : '❌ Not found');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testVenueLookup();