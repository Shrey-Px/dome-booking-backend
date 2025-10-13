const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

// Log all requests
router.use((req, res, next) => {
  console.log('🟢 Availability router - Request received');
  console.log('   Method:', req.method);
  console.log('   Path:', req.path);
  console.log('   Params:', req.params);
  console.log('   Query:', req.query);
  console.log('   Original URL:', req.originalUrl);
  next();
});

// Handle /:facilitySlug format
router.get('/:facilitySlug', (req, res, next) => {
  console.log('🎯 Matched /:facilitySlug route');
  console.log('   facilitySlug:', req.params.facilitySlug);
  next();
}, availabilityController.getAvailability);

// Handle base / format (with facility_id query param)
router.get('/', (req, res, next) => {
  console.log('🎯 Matched base / route');
  console.log('   facility_id:', req.query.facility_id);
  next();
}, availabilityController.getAvailability);

module.exports = router;