// seed-vision-badminton.js - Run this script to create the initial facility data
require('dotenv').config();
const mongoose = require('mongoose');
const Facility = require('./src/models/mongodb/Facility');

async function seedVisionBadminton() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if Vision Badminton already exists
    const existing = await Facility.findBySlug('vision-badminton');
    if (existing) {
      console.log('Vision Badminton facility already exists');
      return;
    }

    // Create Vision Badminton Centre facility
    const visionBadminton = new Facility({
      slug: 'vision-badminton',
      venueId: '68cad6b20a06da55dfb88af5', // Existing venue ID
      name: 'Vision Badminton Centre',
      description: 'Premier badminton facility with 10 professional courts',
      website: 'https://visionbadminton.ca',
      
      courts: [
        { id: 1, name: 'Court 1', sport: 'Badminton' },
        { id: 2, name: 'Court 2', sport: 'Badminton' },
        { id: 3, name: 'Court 3', sport: 'Badminton' },
        { id: 4, name: 'Court 4', sport: 'Badminton' },
        { id: 5, name: 'Court 5', sport: 'Badminton' },
        { id: 6, name: 'Court 6', sport: 'Badminton' },
        { id: 7, name: 'Court 7', sport: 'Badminton' },
        { id: 8, name: 'Court 8', sport: 'Badminton' },
        { id: 9, name: 'Court 9', sport: 'Badminton' },
        { id: 10, name: 'Court 10', sport: 'Badminton' }
      ],
      totalCourts: 10,
      
      operatingHours: {
        weekday: { start: '08:00', end: '20:00' },
        weekend: { start: '06:00', end: '22:00' }
      },
      timezone: 'America/Toronto',
      
      branding: {
        primaryColor: '#EB3958',
        secondaryColor: '#1E293B',
        logoUrl: null,
        faviconUrl: null
      },
      
      pricing: {
        courtRental: 25.00,
        serviceFeePercentage: 1.0,
        taxPercentage: 13.0,
        currency: 'CAD'
      },
      
      contact: {
        email: 'info@visionbadminton.ca',
        phone: '+1-416-555-0123',
        address: {
          street: '123 Sports Drive',
          city: 'Toronto',
          province: 'Ontario',
          postalCode: 'M1A 1A1',
          country: 'Canada'
        }
      },
      
      features: {
        onlineBooking: true,
        emailNotifications: true,
        cancellations: true,
        discounts: true
      },
      
      active: true,
      createdBy: 'system-migration'
    });

    await visionBadminton.save();
    console.log('Vision Badminton Centre facility created successfully');
    console.log('Facility slug:', visionBadminton.slug);
    console.log('Facility ID:', visionBadminton._id);

  } catch (error) {
    console.error('Error seeding facility data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seeder
if (require.main === module) {
  seedVisionBadminton();
}

module.exports = seedVisionBadminton;