const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

router.use((req, res, next) => {
  console.log(`Availability route hit: ${req.method} ${req.path}`);
  console.log('Params:', req.params);
  console.log('Query:', req.query);
  next();
});

// Support both formats
router.get('/:facilitySlug', availabilityController.getAvailability);
router.get('/', availabilityController.getAvailability);

module.exports = router;