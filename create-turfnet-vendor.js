// File: create-turfnet-vendor.js (create in backend root)

require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('./src/models/mongodb/Vendor');
const Facility = require('./src/models/mongodb/Facility');

async function createTurfnetVendor() {
  try {
    console.log('👤 Creating Turfnet vendor account...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the facility
    const facility = await Facility.findOne({ slug: 'turfnet-cricket' });
    
    if (!facility) {
      throw new Error('Facility not found! Run setup-turfnet-facility.js first.');
    }

    // Check if vendor already exists
    let vendor = await Vendor.findOne({ email: 'vendor@turfnetcricket.ca' });
    
    if (vendor) {
      console.log('⚠️  Vendor already exists');
      console.log('   - Email: vendor@turfnetcricket.ca');
      console.log('   - Facility: turfnet-cricket');
      return;
    }

    // Create vendor account
    vendor = await Vendor.create({
      email: 'vendor@turfnetcricket.ca',
      password: 'TurfnetAdmin2025!',  // ⚠️ CHANGE THIS AFTER FIRST LOGIN
      name: 'Turfnet Admin',
      facilitySlug: 'turfnet-cricket',
      facilityId: facility._id,
      role: 'vendor',
      isActive: true
    });

    console.log('✅ Vendor account created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   - Email: vendor@turfnetcricket.ca');
    console.log('   - Password: TurfnetAdmin2025!');
    console.log('   - Dashboard: https://domeweb.netlify.app/vendor/login');
    console.log('\n⚠️  IMPORTANT: Change password after first login!');

  } catch (error) {
    console.error('❌ Vendor creation failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTurfnetVendor();