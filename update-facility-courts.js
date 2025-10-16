require('dotenv').config();
const { connectMongoDB } = require('./src/config/mongodb');
const Facility = require('./src/models/mongodb/Facility');

async function updateFacilityCourts() {
  await connectMongoDB();
  
  const courts = [];
  
  // Add 22 badminton courts
  for (let i = 1; i <= 22; i++) {
    courts.push({
      id: i,
      name: `Court ${i}`,
      sport: 'Badminton',
      active: true
    });
  }
  
  // Add 2 pickleball courts
  courts.push({
    id: 23,
    name: 'Court P1',
    sport: 'Pickleball',
    active: true
  });
  
  courts.push({
    id: 24,
    name: 'Court P2',
    sport: 'Pickleball',
    active: true
  });
  
  const result = await Facility.updateOne(
    { slug: 'vision-badminton' },
    { 
      $set: { 
        courts: courts,
        totalCourts: 24
      }
    }
  );
  
  console.log('Updated facility with 24 courts:', result);
  process.exit(0);
}

updateFacilityCourts();