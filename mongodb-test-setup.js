// mongodb-test-setup.js - Run this to test MongoDB connection and create initial data
require('dotenv').config();
const { initializeMongoModels } = require('./src/models/mongodb');

async function setupTestData() {
  try {
    console.log('Starting MongoDB test setup...\n');
    
    // Initialize MongoDB connection and models
    const { Facility, Booking, Discount } = await initializeMongoModels();
    
    console.log('1. Testing MongoDB Connection...');
    console.log('Connection successful!\n');
    
    // 2. Create test facility
    console.log('2. Creating test facility...');
    
    const facilityData = {
      _id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Dome Sports Complex',
      slug: 'dome-sports',
      address: '123 Sports Avenue, Toronto, ON',
      courts: [
        { id: 1, name: 'Court 1', sport: 'Badminton' },
        { id: 2, name: 'Court 2', sport: 'Badminton' },
        { id: 3, name: 'Court 3', sport: 'Badminton' },
        { id: 4, name: 'Court 4', sport: 'Badminton' },
        { id: 5, name: 'Court 5', sport: 'Badminton' },
        { id: 6, name: 'Court 6', sport: 'Badminton' }
      ],
      operatingHours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '06:00', close: '22:00' },
        sunday: { open: '06:00', close: '22:00' }
      },
      pricePerHour: 25.00,
      active: true
    };
    
    // Check if facility already exists
    let facility = await Facility.findById('123e4567-e89b-12d3-a456-426614174000');
    
    if (!facility) {
      facility = new Facility(facilityData);
      await facility.save();
      console.log('Facility created successfully:', facility.name);
    } else {
      console.log('Facility already exists:', facility.name);
    }
    
    // 3. Create test discount codes
    console.log('\n3. Creating discount codes...');
    
    const discountCodes = [
      {
        code: 'WELCOME10',
        description: '10% off your first booking',
        type: 'percentage',
        value: 10.00,
        minAmount: 0,
        maxDiscount: 50.00,
        usageLimit: 100,
        validFrom: new Date(),
        validUntil: new Date('2025-12-31'),
        active: true
      },
      {
        code: 'SAVE5',
        description: '$5 off any booking',
        type: 'fixed',
        value: 5.00,
        minAmount: 10.00,
        usageLimit: 50,
        validFrom: new Date(),
        validUntil: new Date('2025-12-31'),
        active: true
      }
    ];
    
    for (const discountData of discountCodes) {
      const existingDiscount = await Discount.findOne({ code: discountData.code });
      if (!existingDiscount) {
        const discount = new Discount(discountData);
        await discount.save();
        console.log('Discount created:', discountData.code);
      } else {
        console.log('Discount already exists:', discountData.code);
      }
    }
    
    // 4. Create test booking
    console.log('\n4. Creating test booking...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const testBooking = {
      facilityId: '123e4567-e89b-12d3-a456-426614174000',
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerPhone: '(416) 555-0123',
      courtNumber: 1,
      bookingDate: tomorrow,
      startTime: '14:00',
      endTime: '15:00',
      duration: 60,
      totalAmount: 25.00,
      status: 'paid',
      source: 'web',
      notes: 'Test booking from MongoDB setup'
    };
    
    // Check if test booking already exists
    const existingBooking = await Booking.findOne({
      facilityId: testBooking.facilityId,
      customerEmail: testBooking.customerEmail,
      bookingDate: testBooking.bookingDate,
      startTime: testBooking.startTime
    });
    
    if (!existingBooking) {
      const booking = new Booking(testBooking);
      await booking.save();
      console.log('Test booking created for tomorrow at 2:00 PM');
    } else {
      console.log('Test booking already exists');
    }
    
    // 5. Test queries
    console.log('\n5. Testing queries...');
    
    // Test facility lookup
    const foundFacility = await Facility.findById('123e4567-e89b-12d3-a456-426614174000');
    console.log('Facility lookup test:', foundFacility ? 'PASSED' : 'FAILED');
    
    // Test availability query
    const bookingsForTomorrow = await Booking.getAvailabilityForDate(
      '123e4567-e89b-12d3-a456-426614174000', 
      tomorrow
    );
    console.log('Availability query test:', bookingsForTomorrow.length, 'bookings found for tomorrow');
    
    // Test discount validation
    const welcomeDiscount = await Discount.findValidDiscount('WELCOME10', 30);
    console.log('Discount validation test:', welcomeDiscount ? 'PASSED' : 'FAILED');
    if (welcomeDiscount) {
      const discountAmount = welcomeDiscount.calculateDiscount(30);
      console.log('Discount calculation: $30 booking with WELCOME10 = $' + discountAmount + ' off');
    }
    
    // 6. Show summary
    console.log('\n6. Database Summary:');
    const facilityCount = await Facility.countDocuments();
    const bookingCount = await Booking.countDocuments();
    const discountCount = await Discount.countDocuments();
    
    console.log('- Facilities:', facilityCount);
    console.log('- Bookings:', bookingCount);
    console.log('- Discount codes:', discountCount);
    
    console.log('\n✅ MongoDB test setup completed successfully!');
    console.log('\nYou can now test your availability endpoint with:');
    console.log(`GET /api/v2/availability?facility_id=123e4567-e89b-12d3-a456-426614174000&date=${tomorrow.toISOString().split('T')[0]}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ MongoDB test setup failed:', error);
    console.error('Error details:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    process.exit(1);
  }
}

// Run the setup
console.log('🚀 Starting MongoDB test setup...\n');
setupTestData();