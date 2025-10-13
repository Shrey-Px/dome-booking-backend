const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

// IMPORTANT: Specific routes BEFORE generic routes
router.get('/:facilitySlug', (req, res, next) => {
  console.log('✅ Matched /:facilitySlug route');
  console.log('   Slug:', req.params.facilitySlug);
  console.log('   Query:', req.query);
  next();
}, availabilityController.getAvailability);

// Base route (with query params)
router.get('/', (req, res, next) => {
  console.log('✅ Matched base / route');
  console.log('   Query:', req.query);
  next();
}, availabilityController.getAvailability);

module.exports = router;