// server-mongodb.js - Alternative server for MongoDB testing
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import MongoDB models and controller
const { initializeMongoModels } = require('./src/models/mongodb');
const mongoAvailabilityController = require('./src/controllers/mongodb/availabilityController');

const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 3001; // Different port to avoid conflicts

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://domeweb.netlify.app',
    /\.netlify\.app$/
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DOME Booking API - MongoDB Version',
    version: '2.0.0',
    database: 'MongoDB',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: 'MongoDB',
    timestamp: new Date().toISOString()
  });
});

// MongoDB API Routes (v2)
app.get('/api/v1/availability', mongoAvailabilityController.getAvailability);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    database: 'MongoDB',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    database: 'MongoDB'
  });
});

async function startMongoServer() {
  try {
    // Initialize MongoDB connection and models
    console.log('Initializing MongoDB connection...');
    await initializeMongoModels();
    console.log('MongoDB connection established successfully');
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`🚀 DOME Booking API Server (MongoDB) running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📅 Availability Test: http://localhost:${PORT}/api/v2/availability?facility_id=123e4567-e89b-12d3-a456-426614174000&date=2025-08-26`);
      console.log(`🗃️ Database: MongoDB Atlas`);
      console.log('='.repeat(60));
      
      logger.info(`MongoDB server started on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      
      server.close(async () => {
        console.log('📌 HTTP server closed');
        
        try {
          const { mongoose } = require('./src/models/mongodb');
          await mongoose.connection.close();
          console.log('🗄️ MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error closing MongoDB connection:', error);
          process.exit(1);
        }
      });
    });

    process.on('SIGINT', async () => {
      console.log('\n🛑 SIGINT received, shutting down gracefully...');
      
      server.close(async () => {
        console.log('📌 HTTP server closed');
        
        try {
          const { mongoose } = require('./src/models/mongodb');
          await mongoose.connection.close();
          console.log('🗄️ MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error closing MongoDB connection:', error);
          process.exit(1);
        }
      });
    });

  } catch (error) {
    console.error('❌ Unable to start MongoDB server:', error.message);
    logger.error('Unable to start MongoDB server', { 
      error: error.message, 
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  logger.error('Uncaught Exception', { 
    error: error.message, 
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection', { 
    reason: reason?.message || reason, 
    stack: reason?.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

// Start the server
startMongoServer();