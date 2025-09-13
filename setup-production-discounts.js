// setup-production-discounts.js - Create discount codes in production database
require('dotenv').config();
const { connectMongoDB, mongoose } = require('./src/config/mongodb');
const Discount = require('./src/models/mongodb/Discount');

async function setupProductionDiscounts() {
  try {
    console.log('Setting up discount codes in production database...\n');
    
    await connectMongoDB();
    console.log('Connected to production MongoDB');
    
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
      },
      {
        code: 'FIRSTTIME',
        description: '15% off for new customers',
        type: 'percentage',
        value: 15.00,
        minAmount: 20.00,
        maxDiscount: 25.00,
        usageLimit: 200,
        validFrom: new Date(),
        validUntil: new Date('2025-12-31'),
        active: true
      }
    ];
    
    console.log('Creating discount codes...\n');
    
    for (const discountData of discountCodes) {
      const existingDiscount = await Discount.findOne({ code: discountData.code });
      
      if (existingDiscount) {
        console.log(`Discount "${discountData.code}" already exists - updating...`);
        await Discount.findOneAndUpdate(
          { code: discountData.code },
          discountData,
          { new: true }
        );
      } else {
        const discount = new Discount(discountData);
        await discount.save();
        console.log(`Created discount: ${discountData.code} - ${discountData.description}`);
      }
    }
    
    // Test discount validation
    console.log('\nTesting discount validation...');
    
    const testDiscount = await Discount.findValidDiscount('WELCOME10', 30);
    if (testDiscount) {
      const discountAmount = testDiscount.calculateDiscount(30);
      console.log(`Test: $30 booking with WELCOME10 = $${discountAmount} discount`);
    }
    
    // Show all active discounts
    console.log('\nActive discount codes:');
    const activeDiscounts = await Discount.getActiveDiscounts();
    activeDiscounts.forEach((discount, index) => {
      console.log(`${index + 1}. ${discount.code}: ${discount.description}`);
      console.log(`   Type: ${discount.type}, Value: ${discount.value}${discount.type === 'percentage' ? '%' : ''}`);
      console.log(`   Min Amount: $${discount.minAmount}, Usage: ${discount.usedCount}/${discount.usageLimit || 'unlimited'}`);
    });
    
    console.log('\nDiscount setup completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Failed to setup discounts:', error);
    process.exit(1);
  }
}

setupProductionDiscounts();