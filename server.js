// server.js - FIXED VERSION
const app = require('./src/app');
const { sequelize } = require('./src/models'); // Import sequelize correctly
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync database (create tables if they don't exist)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Syncing database...');
      await sequelize.sync({ alter: false }); // Set to true if you want to alter existing tables
      console.log('✅ Database synced successfully');
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🧪 CORS Test: http://localhost:${PORT}/test-cors`);
      console.log(`📅 Availability Test: http://localhost:${PORT}/api/v1/availability?facility_id=123e4567-e89b-12d3-a456-426614174000&date=2025-08-08`);
      console.log('='.repeat(50));
      
      logger.info(`Server started on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        try {
          await sequelize.close();
          console.log('🗄️ Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error closing database connection:', error);
          process.exit(1);
        }
      });
    });

    process.on('SIGINT', async () => {
      console.log('\n🛑 SIGINT received, shutting down gracefully...');
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        try {
          await sequelize.close();
          console.log('🗄️ Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error closing database connection:', error);
          process.exit(1);
        }
      });
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error.message);
    logger.error('Unable to start server', { 
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
startServer();