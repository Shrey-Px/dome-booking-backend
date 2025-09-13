const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

router.use((req, res, next) => {
  console.log(`Availability route hit: ${req.method} ${req.path}`);
  console.log('Query params:', req.query);
  next();
});

router.get('/', availabilityController.getAvailability);

module.exports = router;