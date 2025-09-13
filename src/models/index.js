// src/models/index.js - FIXED VERSION with proper config handling
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');

console.log('📋 Database config:', {
  host: config.host,
  port: config.port,
  database: config.database,
  dialect: config.dialect,
  username: config.username ? 'SET' : 'NOT SET'
});

// Initialize Sequelize with proper config destructuring
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging,
  pool: config.pool,
  define: config.define
});

// Import model definitions
const FacilityModel = require('./Facility');
const BookingModel = require('./Booking');
const DiscountModel = require('./Discount');

// Initialize models
console.log('🔧 Initializing models...');
const Facility = FacilityModel(sequelize, DataTypes);
const Booking = BookingModel(sequelize, DataTypes);
const Discount = DiscountModel(sequelize, DataTypes);

console.log('✅ Models initialized:', Object.keys({ Facility, Booking, Discount }));

// Define associations after all models are initialized
const models = { Facility, Booking, Discount };

console.log('🔗 Setting up associations...');
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    console.log(`🔗 Setting up associations for ${modelName}`);
    models[modelName].associate(models);
  }
});

console.log('✅ All models and associations initialized');

// Test database connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully');
  })
  .catch(err => {
    console.error('❌ Unable to connect to database:', err.message);
  });

// Export sequelize instance and models
module.exports = {
  sequelize,
  Sequelize,
  Facility,
  Booking,
  Discount
};