// update-facility-courts-fix.js
require('dotenv').config();
const { connectMongoDB } = require('./src/config/mongodb');
const Facility = require('./src/models/mongodb/Facility');

async function fixCourtIds() {
  await connectMongoDB();
  
  const courts = [];
  
  // Badminton courts 1-22
  for (let i = 1; i <= 22; i++) {
    courts.push({
      id: i,
      name: `Court ${i}`,
      sport: 'Badminton',
      active: true
    });
  }
  
  // Pickleball courts - Use NUMERIC IDs consistently
  courts.push(
    { id: 23, name: 'Court P1', sport: 'Pickleball', active: true },
    { id: 24, name: 'Court P2', sport: 'Pickleball', active: true }
  );
  
  await Facility.updateOne(
    { slug: 'vision-badminton' },
    { 
      $set: { 
        courts, 
        totalCourts: 24
      }
    }
  );
  
  console.log('Fixed facility court IDs');
  process.exit(0);
}

fixCourtIds();