require('dotenv').config();
const mongoose = require('mongoose');

async function updateVenueSlug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Use capital V - "Venue" collection
    console.log('\n📋 Searching for all venues in "Venue" collection...\n');
    const allVenues = await db.collection('Venue').find({}).toArray();
    
    if (allVenues.length === 0) {
      console.log('❌ No venues found in Venue collection!');
      process.exit(1);
    }

    console.log(`✅ Found ${allVenues.length} venue(s):\n`);
    
    allVenues.forEach((venue, index) => {
      console.log(`${index + 1}. Name: "${venue.fullName || venue.name || 'NO NAME'}"`);
      console.log(`   ID: ${venue._id}`);
      console.log(`   Slug: ${venue.slug || 'NOT SET'}`);
      console.log('');
    });

    // Try to find Vision Badminton
    const venue = await db.collection('Venue').findOne({
      $or: [
        { fullName: /vision/i },
        { name: /vision/i },
        { fullName: /badminton/i },
        { name: /badminton/i }
      ]
    });
    
    if (!venue) {
      console.log('❌ Could not find a venue with "vision" or "badminton" in the name');
      console.log('ℹ️  Please check the names above and tell me which one to update');
      process.exit(1);
    }

    console.log('✅ Found matching venue:', venue.fullName || venue.name);
    console.log('📋 Current _id:', venue._id);
    console.log('📋 Current slug:', venue.slug || 'NOT SET');

    // Update directly using MongoDB
    const result = await db.collection('Venue').updateOne(
      { _id: venue._id },
      { 
        $set: { 
          slug: 'vision-badminton',
          updatedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log('\n✅ Slug added successfully!');
      
      // Verify the update
      const updatedVenue = await db.collection('Venue').findOne({ _id: venue._id });
      console.log('✅ Verified slug:', updatedVenue.slug);
      console.log('\n🎉 Done! You can now use facilitySlug in bookings.');
    } else if (venue.slug === 'vision-badminton') {
      console.log('\nℹ️  Slug already set correctly to: vision-badminton');
    } else {
      console.log('\n⚠️  No changes made');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

updateVenueSlug();