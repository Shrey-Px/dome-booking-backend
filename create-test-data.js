// create-test-data.js - Fixed version
const sequelize = require('./src/config/database');

// Import models correctly
const Facility = require('./src/models/Facility');
const Discount = require('./src/models/Discount'); 
const Booking = require('./src/models/Booking');

async function createTestData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Set up model associations
    const setupAssociations = () => {
      // Facility has many bookings
      Facility.hasMany(Booking, { foreignKey: 'facilityId' });
      Booking.belongsTo(Facility, { foreignKey: 'facilityId' });
    };

    setupAssociations();

    // Sync models to ensure tables exist
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized');

    // Create test facility
    console.log('🏗️ Creating test facility...');
    
    const [facility, created] = await Facility.findOrCreate({
      where: { slug: 'dome-sports' },
      defaults: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Dome Sports Complex',
        slug: 'dome-sports',
        address: '123 Sports Ave, Toronto, ON M5V 1A1',
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
          saturday: { open: '08:00', close: '20:00' },
          sunday: { open: '08:00', close: '20:00' }
        },
        pricePerHour: 25.00,
        active: true
      }
    });

    if (created) {
      console.log('✅ New facility created:', facility.name);
    } else {
      console.log('✅ Facility already exists:', facility.name);
    }

    // Create test discount codes
    console.log('🎫 Creating discount codes...');
    
    const [welcome10, welcome10Created] = await Discount.findOrCreate({
      where: { code: 'WELCOME10' },
      defaults: {
        code: 'WELCOME10',
        description: '10% off your first booking',
        type: 'percentage',
        value: 10.00,
        minAmount: 0,
        maxDiscount: 50.00,
        usageLimit: 100,
        usedCount: 0,
        validFrom: new Date(),
        validUntil: new Date('2025-12-31'),
        active: true
      }
    });

    const [save5, save5Created] = await Discount.findOrCreate({
      where: { code: 'SAVE5' },
      defaults: {
        code: 'SAVE5',
        description: '$5 off any booking',
        type: 'fixed',
        value: 5.00,
        minAmount: 10.00,
        usageLimit: 50,
        usedCount: 0,
        validFrom: new Date(),
        validUntil: new Date('2025-12-31'),
        active: true
      }
    });

    console.log('✅ Discount codes created/verified');
    console.log('\n🎉 Test data setup complete!');
    console.log(`   Facility: ${facility.name} (ID: ${facility.id})`);
    console.log(`   You can now test the availability endpoint!`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    await sequelize.close();
    process.exit(1);
  }
}

createTestData();