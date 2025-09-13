// create-facility.js - Run this in your backend to create the facility
const { Facility } = require('./src/models');

async function createFacility() {
  try {
    console.log('🏢 Creating facility...');
    
    const facility = await Facility.create({
      id: '123e4567-e89b-12d3-a456-426614174000', // Use the UUID your frontend expects
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
    
    console.log('✅ Facility created successfully!');
    console.log('📋 Facility details:');
    console.log('   ID:', facility.id);
    console.log('   Name:', facility.name);
    console.log('   Courts:', facility.courts.length);
    console.log('   Price per hour: $', facility.pricePerHour);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to create facility:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('🔄 Facility already exists, updating...');
      
      try {
        const existingFacility = await Facility.findByPk('123e4567-e89b-12d3-a456-426614174000');
        if (existingFacility) {
          await existingFacility.update({
            name: 'Dome Sports Complex',
            courts: [
              { id: 1, name: 'Court 1', sport: 'Badminton' },
              { id: 2, name: 'Court 2', sport: 'Badminton' },
              { id: 3, name: 'Court 3', sport: 'Badminton' },
              { id: 4, name: 'Court 4', sport: 'Badminton' },
              { id: 5, name: 'Court 5', sport: 'Badminton' },
              { id: 6, name: 'Court 6', sport: 'Badminton' }
            ],
            pricePerHour: 25.00,
            active: true
          });
          console.log('✅ Facility updated successfully!');
        }
      } catch (updateError) {
        console.error('❌ Failed to update facility:', updateError);
      }
    }
    
    process.exit(1);
  }
}

// Run the function
createFacility();