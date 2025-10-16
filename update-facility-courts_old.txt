require('dotenv').config();
const mongoose = require('mongoose');
const Facility = require('./src/models/mongodb/Facility');

const MONGODB_URI = process.env.MONGODB_URI;

async function updateFacility() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const facility = await Facility.findOne({ slug: 'vision-badminton' });
    
    if (!facility) {
      console.error('❌ Vision Badminton facility not found!');
      process.exit(1);
    }

    console.log('Found facility:', facility.name);

    // Create 22 badminton courts (NO PRICING)
    const badmintonCourts = [];
    for (let i = 1; i <= 22; i++) {
      badmintonCourts.push({
        id: i,
        name: `Court ${i}`,
        sport: 'Badminton',
        active: true
      });
    }

    // Create 2 pickleball courts (NO PRICING)
    const pickleballCourts = [
      {
        id: 23,
        name: 'Court P1',
        sport: 'Pickleball',
        active: true
      },
      {
        id: 24,
        name: 'Court P2',
        sport: 'Pickleball',
        active: true
      }
    ];

    const allCourts = [...badmintonCourts, ...pickleballCourts];

    facility.courts = allCourts;
    facility.totalCourts = 24;
    
    await facility.save();

    console.log('✅ Facility updated successfully!');
    console.log('Total courts:', facility.totalCourts);
    console.log('Badminton courts:', badmintonCourts.length);
    console.log('Pickleball courts:', pickleballCourts.length);
    console.log('Sample badminton court:', facility.courts.find(c => c.id === 1));
    console.log('Sample pickleball court:', facility.courts.find(c => c.id === 23));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateFacility();