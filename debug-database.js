// debug-database.js - Run this in your backend to check and fix database
const { Facility, Booking } = require('./src/models');

async function debugDatabase() {
  try {
    console.log('🔍 Checking database...\n');
    
    // 1. Check all facilities
    console.log('📋 All facilities in database:');
    const allFacilities = await Facility.findAll({ raw: true });
    console.log(allFacilities);
    
    if (allFacilities.length === 0) {
      console.log('❌ No facilities found in database!');
      console.log('🔧 Creating facility with UUID...');
      
      // Create facility with UUID
      const facility = await Facility.create({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Dome Sports Complex',
        slug: 'dome-sports',
        address: '123 Sports Avenue, Toronto, ON',
        phone: '(416) 555-0123',
        email: 'info@domesports.com',
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
      });
      
      console.log('✅ Facility created:', facility.id);
    } else {
      console.log(`✅ Found ${allFacilities.length} facilities`);
      
      // Check if our UUID facility exists
      const targetFacility = await Facility.findByPk('123e4567-e89b-12d3-a456-426614174000');
      if (!targetFacility) {
        console.log('❌ Target UUID facility not found!');
        console.log('🔧 Creating it...');
        
        await Facility.create({
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Dome Sports Complex',
          slug: 'dome-sports',
          address: '123 Sports Avenue, Toronto, ON',
          phone: '(416) 555-0123',
          email: 'info@domesports.com',
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
        });
        
        console.log('✅ Target facility created');
      } else {
        console.log('✅ Target UUID facility exists:', targetFacility.name);
      }
    }
    
    // 2. Test availability query
    console.log('\n🧪 Testing availability query...');
    const facilityId = '123e4567-e89b-12d3-a456-426614174000';
    const date = '2025-08-08';
    
    console.log(`🔍 Looking for facility: ${facilityId}`);
    const facility = await Facility.findByPk(facilityId);
    
    if (!facility) {
      console.log('❌ Facility not found with UUID');
    } else {
      console.log('✅ Facility found:', facility.name);
      
      // Test booking query
      console.log(`🔍 Looking for bookings on ${date}...`);
      const bookings = await Booking.findAll({
        where: {
          facilityId: facilityId,
          bookingDate: date,
          status: ['pending', 'paid', 'completed', 'confirmed']
        },
        raw: true
      });
      
      console.log(`📋 Found ${bookings.length} bookings`);
      
      if (bookings.length > 0) {
        console.log('Sample booking:', bookings[0]);
      }
    }
    
    // 3. Check model definitions
    console.log('\n📋 Model info:');
    console.log('Facility model attributes:', Object.keys(Facility.rawAttributes));
    console.log('Booking model attributes:', Object.keys(Booking.rawAttributes));
    
    console.log('\n✅ Database debug complete');
    
  } catch (error) {
    console.error('❌ Database debug error:', error);
    console.error('Full error:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  }
  
  process.exit(0);
}

// Run the debug
debugDatabase();