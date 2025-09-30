// server-production-mongodb.js - Updated with Stripe Webhook Handler
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const TenantMiddleware = require('./src/middleware/tenant');
const tenantAvailabilityController = require('./src/controllers/mongodb/tenantAvailabilityController');
const Facility = require('./src/models/mongodb/Facility');
const stripeWebhookController = require('./src/controllers/mongodb/stripeWebhookController');

// Import MongoDB connection and controllers
const { connectMongoDB, mongoose } = require('./src/config/mongodb');
const productionAvailabilityController = require('./src/controllers/mongodb/productionAvailabilityController');
const productionBookingController = require('./src/controllers/mongodb/productionBookingController');
const productionDiscountController = require('./src/controllers/mongodb/productionDiscountController');
const productionPaymentController = require('./src/controllers/mongodb/productionPaymentController');
const cancellationRoutes = require('./src/routes/cancellation');

const logger = require('./src/utils/logger');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

// IMPORTANT: Stripe webhook route MUST come before express.json() middleware
// This is because Stripe needs the raw body to verify the signature
app.post('/api/v1/webhook/stripe', 
  express.raw({ type: 'application/json' }),
  stripeWebhookController.handleWebhook
);

// Regular middleware (after webhook route)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://domeweb.netlify.app',
    /\.netlify\.app$/
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DOME Booking API - Production MongoDB',
    version: '2.0.0',
    database: 'Production MongoDB',
    venue: 'Vision Badminton Centre',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoints
app.get('/debug/connection', (req, res) => {
  res.json({
    success: true,
    mongooseState: mongoose.connection.readyState,
    stateNames: {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    },
    currentState: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
    dbName: mongoose.connection.db?.databaseName || 'unknown'
  });
});

app.get('/debug/venues', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        error: 'Database not connected',
        connectionState: mongoose.connection.readyState
      });
    }

    const Venue = require('./src/models/mongodb/Venue');
    const venues = await Venue.find({});
    
    res.json({
      success: true,
      count: venues.length,
      venues: venues.map(v => ({
        id: v._id,
        name: v.fullName,
        active: v.isActive
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/current-ip', (req, res) => {
  require('https').get('https://api.ipify.org?format=json', (response) => {
    let data = '';
    response.on('data', (chunk) => data += chunk);
    response.on('end', () => {
      const ip = JSON.parse(data).ip;
      res.json({ ip: ip, forwardedFor: req.headers['x-forwarded-for'] });
    });
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: 'Production MongoDB',
    timestamp: new Date().toISOString()
  });
});

// Availability routes
app.get('/api/v1/availability', 
  TenantMiddleware.withDefaultTenant,
  tenantAvailabilityController.getAvailability
);

app.get('/api/v1/tenant/availability', 
  TenantMiddleware.resolveTenant,
  tenantAvailabilityController.getAvailability
);

// Cancellation routes
app.use('/api/v1/cancellation', cancellationRoutes);

// Booking routes
app.post('/api/v1/booking/create-booking', 
  TenantMiddleware.withDefaultTenant,
  productionBookingController.createBooking
);

app.post('/api/v1/tenant/booking/create-booking',
  TenantMiddleware.resolveTenant,
  productionBookingController.createBooking
);

app.get('/api/v1/booking/:id',
  TenantMiddleware.tryResolveTenant,
  productionBookingController.getBooking
);

app.get('/api/v1/bookings', productionBookingController.getAllBookings);

app.post('/api/v1/booking/confirm-payment',
  TenantMiddleware.tryResolveTenant,
  productionBookingController.confirmPayment
);

// Discount routes
app.post('/api/v1/discount/apply-discount',
  TenantMiddleware.withDefaultTenant,
  productionDiscountController.applyDiscount
);

app.post('/api/v1/tenant/discount/apply-discount',
  TenantMiddleware.resolveTenant,
  productionDiscountController.applyDiscount
);

// Payment routes
app.post('/api/v1/payment/create-payment-intent',
  TenantMiddleware.tryResolveTenant,
  productionPaymentController.createPaymentIntent
);

app.post('/api/v1/payment/process-payment',
  TenantMiddleware.tryResolveTenant,
  productionPaymentController.processPayment
);

// Facility management endpoints
app.get('/api/v1/facilities', async (req, res) => {
  try {
    const facilities = await Facility.getActiveFacilities();
    res.json({
      success: true,
      data: facilities.map(facility => ({
        slug: facility.slug,
        name: facility.name,
        description: facility.description,
        branding: facility.branding,
        totalCourts: facility.totalCourts,
        active: facility.active
      }))
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facilities',
      error: error.message
    });
  }
});

app.get('/api/v1/facilities/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const facility = await Facility.findBySlug(slug);
    
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found',
        slug
      });
    }

    res.json({
      success: true,
      data: facility
    });
  } catch (error) {
    console.error('Error fetching facility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facility',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    database: 'Production MongoDB',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    database: 'Production MongoDB'
  });
});

async function startProductionServer() {
  try {
    console.log('Initializing Production MongoDB connection...');
    await connectMongoDB();
    console.log('Production MongoDB connection established successfully');
    
    const server = app.listen(PORT, () => {
      console.log('='.repeat(70));
      console.log(`DOME Booking API Server (Production MongoDB) running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Base URL: http://localhost:${PORT}`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
      console.log(`Webhook URL: http://localhost:${PORT}/api/v1/webhook/stripe`);
      console.log(`Database: Production MongoDB (Vision Badminton Centre)`);
      console.log('='.repeat(70));
      
      logger.info(`Production MongoDB server started on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          await mongoose.connection.close();
          console.log('Production MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          console.error('Error closing MongoDB connection:', error);
          process.exit(1);
        }
      });
    });

    process.on('SIGINT', async () => {
      console.log('\nSIGINT received, shutting down gracefully...');
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          await mongoose.connection.close();
          console.log('Production MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          console.error('Error closing MongoDB connection:', error);
          process.exit(1);
        }
      });
    });

  } catch (error) {
    console.error('Unable to start production MongoDB server:', error.message);
    logger.error('Unable to start production MongoDB server', { 
      error: error.message, 
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception', { 
    error: error.message, 
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection', { 
    reason: reason?.message || reason, 
    stack: reason?.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

startProductionServer();