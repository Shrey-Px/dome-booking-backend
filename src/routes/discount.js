const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

router.use((req, res, next) => {
  console.log(`Discount route hit: ${req.method} ${req.path}`);
  next();
});

router.post('/apply-discount', discountController.applyDiscount);
router.get('/', discountController.getAllDiscounts);

module.exports = router;