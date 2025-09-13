const express = require('express');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  console.log('GET /', 'Health check');
  console.log('GET /api/v1/availability', 'Get availability');
  console.log('POST /api/v1/booking/create-booking', 'Create booking');
  console.log('POST /api/v1/payment/process-payment', 'Process payment');
  console.log('POST /api/v1/discount/apply-discount', 'Apply discount');
});

// Test endpoints
setTimeout(() => {
  console.log('\n=== Testing Routes ===');
  
  // Test basic endpoint
  fetch('http://localhost:3000/')
    .then(res => res.json())
    .then(data => console.log('Root endpoint:', data))
    .catch(err => console.error('Root endpoint error:', err));
    
  // Test API endpoints
  fetch('http://localhost:3000/api/v1/availability?facility_id=test&date=2025-08-03')
    .then(res => res.json())
    .then(data => console.log('Availability endpoint:', data))
    .catch(err => console.error('Availability endpoint error:', err));
    
}, 2000);