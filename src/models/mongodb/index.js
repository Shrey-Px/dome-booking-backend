// src/models/mongodb/index.js
const { connectMongoDB, mongoose } = require('../../config/mongodb');

// Import all models
const Facility = require('./Facility');
const Booking = require('./Booking');
const Discount = require('./Discount');

// Initialize MongoDB connection
const initializeMongoModels = async () => {
  try {
    await connectMongoDB();
    
    console.log('✅ MongoDB models initialized:', {
      Facility: Facility.modelName,
      Booking: Booking.modelName,
      Discount: Discount.modelName
    });
    
    return { Facility, Booking, Discount, mongoose };
  } catch (error) {
    console.error('❌ Failed to initialize MongoDB models:', error);
    throw error;
  }
};

// Export models and initialization function
module.exports = {
  initializeMongoModels,
  Facility,
  Booking,
  Discount,
  mongoose
};