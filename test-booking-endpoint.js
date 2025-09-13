// test-booking-endpoint.js
const fetch = require('node-fetch'); // You may need: npm install node-fetch

async function testBookingEndpoint() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/booking/test-schema', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.text();
    console.log('Response:', result);
  } catch (error) {
    console.log('Server not responding or endpoint not found');
  }
}

testBookingEndpoint();