// src/config/mongodb.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectMongoDB = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000
    };
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, options);
    
    // Wait for connection to be ready
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB connected successfully');
      console.log('Database name:', mongoose.connection.db.databaseName);
      console.log('Connection state:', mongoose.connection.readyState);
      return mongoose.connection;
    } else {
      throw new Error('MongoDB connection not ready');
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error; // Re-throw to stop server startup
  }
};

const closeMongoDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
};

module.exports = {
  connectMongoDB,
  closeMongoDB,
  mongoose
};