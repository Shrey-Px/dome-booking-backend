// src/routes/cancellation.js
const express = require('express');
const router = express.Router();
const productionBookingController = require('../controllers/mongodb/productionBookingController');

router.get('/:id', productionBookingController.getCancellationDetails);
router.post('/:id/cancel', productionBookingController.processCancellation);

module.exports = router;