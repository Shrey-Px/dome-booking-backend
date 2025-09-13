const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.use((req, res, next) => {
  console.log(`Payment route hit: ${req.method} ${req.path}`);
  next();
});

router.post('/process-payment', paymentController.processPayment);
router.post('/create-payment-intent', paymentController.createPaymentIntent);
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;