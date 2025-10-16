// check-facility-courts.js - Run this to check your facility configuration
require('dotenv').config();
const mongoose = require('mongoose');
const Facility = require('./src/models/mongodb/Facility');

async function checkFacilityCourts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find Vision Badminton facility
    const facility = await Facility.findOne({ slug: 'vision-badminton' });
    
    if (!facility) {
      console.error('❌ Facility not found!');
      process.exit(1);
    }

    console.log('\n📊 Facility Information:');
    console.log('Name:', facility.name);
    console.log('Slug:', facility.slug);
    console.log('Total Courts (field):', facility.totalCourts);
    console.log('Courts Array Length:', facility.courts?.length || 0);
    
    if (facility.courts && facility.courts.length > 0) {
      console.log('\n✅ Courts are configured:');
      
      const badmintonCourts = facility.courts.filter(c => c.sport === 'Badminton');
      const pickleballCourts = facility.courts.filter(c => c.sport === 'Pickleball');
      
      console.log(`  Badminton: ${badmintonCourts.length} courts`);
      console.log(`  Pickleball: ${pickleballCourts.length} courts`);
      
      console.log('\n📋 All Courts:');
      facility.courts.forEach(court => {
        console.log(`  - ${court.name} (ID: ${court.id}, Sport: ${court.sport}, Active: ${court.active})`);
      });
    } else {
      console.log('\n❌ NO COURTS CONFIGURED!');
      console.log('Courts field:', facility.courts);
      console.log('\nThe facility needs to have courts added to the database.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFacilityCourts();