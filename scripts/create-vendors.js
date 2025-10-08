require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../src/models/mongodb/Vendor');
const Facility = require('../src/models/mongodb/Facility');

async function createVendors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get Vision Badminton facility
    const facility = await Facility.findOne({ slug: 'vision-badminton' });
    
    if (!facility) {
      console.error('Vision Badminton facility not found. Run seed-vision-badminton.js first.');
      process.exit(1);
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ email: 'vendor@visionbadminton.ca' });
    
    if (existingVendor) {
      console.log('Vendor already exists:', existingVendor.email);
      process.exit(0);
    }

    // Create vendor account
    const vendor = new Vendor({
      email: 'vendor@visionbadminton.ca',
      password: 'VisionAdmin2025!', // Will be hashed automatically
      name: 'Vision Badminton Admin',
      facilitySlug: facility.slug,
      facilityId: facility._id,
      role: 'vendor',
      isActive: true
    });

    await vendor.save();

    console.log('✅ Vendor created successfully!');
    console.log('-----------------------------------');
    console.log('Email:', vendor.email);
    console.log('Password: VisionAdmin2025!');
    console.log('Facility:', facility.name);
    console.log('-----------------------------------');
    console.log('⚠️  IMPORTANT: Change this password after first login!');

  } catch (error) {
    console.error('Error creating vendor:', error);
  } finally {
    await mongoose.connection.close();
  }
}

createVendors();