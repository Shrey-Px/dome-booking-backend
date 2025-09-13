const { Facility, Discount } = require('../models');
const logger = require('./logger');

const seedDatabase = async () => {
  try {
    // Create sample facility
    const facility = await Facility.findOrCreate({
      where: { slug: 'dome-sports-downtown' },
      defaults: {
        name: 'Dome Sports Downtown',
        slug: 'dome-sports-downtown',
        address: '123 Main Street, Toronto, ON M5V 3A8',
        courts: [
          { number: 1, name: 'Court 1', type: 'Basketball' },
          { number: 2, name: 'Court 2', type: 'Basketball' },
          { number: 3, name: 'Court 3', type: 'Badminton' },
          { number: 4, name: 'Court 4', type: 'Badminton' },
        ],
        operatingHours: {
          mon: { open: '06:00', close: '23:00' },
          tue: { open: '06:00', close: '23:00' },
          wed: { open: '06:00', close: '23:00' },
          thu: { open: '06:00', close: '23:00' },
          fri: { open: '06:00', close: '23:00' },
          sat: { open: '08:00', close: '22:00' },
          sun: { open: '08:00', close: '22:00' },
        },
        pricePerHour: 50.00,
        active: true,
      },
    });

    // Create sample discount codes
    const discounts = [
      {
        code: 'WELCOME10',
        description: '10% off your first booking',
        type: 'percentage',
        value: 10,
        minAmount: 25,
        maxDiscount: 20,
        usageLimit: 100,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        active: true,
      },
      {
        code: 'SAVE5',
        description: '$5 off any booking',
        type: 'fixed',
        value: 5,
        minAmount: 20,
        usageLimit: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        active: true,
      },
    ];

    for (const discountData of discounts) {
      await Discount.findOrCreate({
        where: { code: discountData.code },
        defaults: discountData,
      });
    }

    logger.info('Database seeded successfully');
    return { success: true };

  } catch (error) {
    logger.error('Error seeding database:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { seedDatabase };