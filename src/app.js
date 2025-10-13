// src/app.js - Complete file with CORS fix and proper debug endpoints
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const config = require('./config/environment');
const logger = require('./utils/logger');

const app = express();

// Enhanced logging for debugging
console.log('='.repeat(50));
console.log('🚀 Starting Dome Booking API Server');
console.log('Time:', new Date().toISOString());
console.log('Environment:', process.env.NODE_ENV || 'not set');
console.log('Port:', process.env.PORT || 3000);
console.log('Frontend URL:', process.env.FRONTEND_URL || 'not set');
console.log('='.repeat(50));

// Basic middleware
app.use(helmet());
app.use(morgan('combined'));

// AGGRESSIVE CORS FIX - This should resolve the CORS issues
console.log('🔧 Setting up CORS...');

app.use((req, res, next) => {
  const allowedOrigins = [
    'https://domeweb.netlify.app',
    'http://localhost:3001',
    'http://localhost:3000',
    'https://localhost:3001',
    'https://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  console.log('🌐 Request from origin:', origin);
  
  // For testing: Allow all origins (you can restrict this later)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling preflight OPTIONS request');
    res.status(200).end();
    return;
  }
  
  next();
});

// Backup CORS middleware
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS middleware origin check:', origin);
    // Allow all origins for testing
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware - logs every request
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📍 [${timestamp}] ${req.method} ${req.originalUrl}`);
  console.log('🔗 Origin:', req.headers.origin || 'no origin');
  console.log('🔗 User-Agent:', req.headers['user-agent']?.substring(0, 50) + '...' || 'no user-agent');
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('🔍 Query:', JSON.stringify(req.query, null, 2));
  }
  next();
});

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 booking requests per windowMs
  message: 'Too many booking requests from this IP, please try again later.'
});

app.use(generalLimiter);

// Health check endpoints
app.get('/', (req, res) => {
  console.log('✅ Health check endpoint hit');
  res.json({ 
    message: 'Dome Booking API is running!', 
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'not set'
  });
});

app.get('/health', (req, res) => {
  console.log('✅ Health status endpoint hit');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// CORS Test endpoint
app.get('/test-cors', (req, res) => {
  console.log('🧪 CORS test endpoint hit from:', req.headers.origin);
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    method: req.method,
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
  });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  console.log('🔍 Debug endpoint hit');
  res.json({
    message: 'Debug endpoint working',
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    origin: req.headers.origin,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
      'ngrok-skip-browser-warning': req.headers['ngrok-skip-browser-warning']
    },
    query: req.query,
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Database debug endpoint - MOVED BEFORE ROUTES
app.get('/debug/bookings', async (req, res) => {
  try {
    console.log('🗄️ Debug endpoint hit - checking database...');
    
    // Import models
    const { Booking } = require('./models');
    
    console.log('📋 Fetching all bookings...');
    
    const allBookings = await Booking.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20,
      raw: true
    });
    
    console.log(`📊 Found ${allBookings.length} total bookings`);
    
    const todayBookings = await Booking.findAll({
      where: {
        bookingDate: '2025-08-04'
      },
      raw: true
    });
    
    console.log(`📊 Found ${todayBookings.length} bookings for 2025-08-04`);
    
    res.json({
      success: true,
      totalBookings: allBookings.length,
      todayBookings: todayBookings.length,
      recentBookings: allBookings.map(booking => ({
        id: booking.id,
        facilityId: booking.facilityId,
        court: booking.courtNumber,
        date: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        customer: booking.customerName,
        created: booking.createdAt
      })),
      todayDetails: todayBookings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple debug endpoint for basic testing
app.get('/simple-debug', async (req, res) => {
  try {
    console.log('🔍 Simple debug endpoint hit');
    const { Booking } = require('./models');
    const count = await Booking.count();
    
    res.json({ 
      totalBookings: count, 
      status: 'working',
      timestamp: new Date().toISOString(),
      message: 'Simple debug endpoint working correctly'
    });
  } catch (error) {
    console.error('❌ Simple debug error:', error);
    res.status(500).json({ 
      error: error.message, 
      status: 'failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced availability debug endpoint
app.get('/debug/availability/:facilityId/:date', async (req, res) => {
  try {
    console.log('🔍 Availability debug endpoint hit');
    const { facilityId, date } = req.params;
    
    const { Booking } = require('./models');
    
    console.log(`📊 Checking availability for facility ${facilityId} on ${date}`);
    
    const bookings = await Booking.findAll({
      where: {
        facilityId: facilityId,
        bookingDate: date,
        status: ['confirmed', 'pending']
      },
      raw: true
    });
    
    console.log(`📊 Found ${bookings.length} active bookings for this date`);
    
    res.json({
      success: true,
      facilityId,
      date,
      activeBookings: bookings.length,
      bookings: bookings.map(booking => ({
        id: booking.id,
        court: booking.courtNumber,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        customer: booking.customerName
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Availability debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Import and mount routes
try {
  console.log('📁 Loading route modules...');
  
  const bookingRoutes = require('./routes/booking');
  const availabilityRoutes = require('./routes/availability');
  const facilitiesRoutes = require('./routes/facilities'); // ← ADD THIS
  const paymentRoutes = require('./routes/payment');
  const discountRoutes = require('./routes/discount');
  
  console.log('✅ All route modules loaded successfully');
  
  // Mount routes with enhanced logging
  console.log('🛣️ Mounting routes...');

  app.use('/api/v1/facilities', (req, res, next) => {
    console.log('🎯 Facilities route hit:', req.method, req.path);
    next();
  }, facilitiesRoutes);
  
  app.use('/api/v1/availability', availabilityRoutes);
  
  app.use('/api/v1/booking', (req, res, next) => {
    console.log('🎯 Booking route hit:', req.method, req.path);
    console.log('🎯 Full URL:', req.originalUrl);
    next();
  }, bookingLimiter, bookingRoutes);
  
  app.use('/api/v1/payment', (req, res, next) => {
    console.log('🎯 Payment route hit:', req.method, req.path);
    next();
  }, paymentRoutes);
  
  app.use('/api/v1/discount', (req, res, next) => {
    console.log('🎯 Discount route hit:', req.method, req.path);
    next();
  }, discountRoutes);
  
  console.log('✅ All routes mounted successfully');
  console.log('📋 Available endpoints:');
  console.log('   GET  /', 'Health check');
  console.log('   GET  /health', 'Health status');
  console.log('   GET  /test-cors', 'CORS test');
  console.log('   GET  /debug', 'Debug info');
  console.log('   GET  /debug/bookings', 'Database debug');
  console.log('   GET  /simple-debug', 'Simple database test');
  console.log('   GET  /debug/availability/:facilityId/:date', 'Availability debug');
  console.log('   GET  /api/v1/availability', 'Get availability');
  console.log('   POST /api/v1/booking/create-booking', 'Create booking');
  console.log('   POST /api/v1/payment/process-payment', 'Process payment');
  console.log('   POST /api/v1/discount/apply-discount', 'Apply discount');
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error('Full error:', error);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler with detailed logging - MUST BE LAST
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl} from ${req.headers.origin || 'unknown'}`);
  console.log('Available routes listed above ⬆️');
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /',
      'GET /health', 
      'GET /test-cors',
      'GET /debug',
      'GET /debug/bookings',
      'GET /simple-debug',
      'GET /debug/availability/:facilityId/:date',
      'GET /api/v1/availability',
      'POST /api/v1/booking/create-booking',
      'POST /api/v1/payment/process-payment',
      'POST /api/v1/discount/apply-discount'
    ]
  });
});

module.exports = app;