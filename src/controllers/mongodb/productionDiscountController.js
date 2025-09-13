// src/controllers/mongodb/productionDiscountController.js
const Discount = require('../../models/mongodb/Discount');

const productionDiscountController = {
  applyDiscount: async (req, res) => {
    try {
      console.log('[Production MongoDB] Applying discount...');
      const { code, amount } = req.body;

      if (!code || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Code and amount are required'
        });
      }

      // Find valid discount code
      const discount = await Discount.findValidDiscount(code, amount);

      if (!discount) {
        return res.status(404).json({
          success: false,
          valid: false,
          message: 'Invalid or expired discount code'
        });
      }

      // Check if discount is valid for this amount
      if (!discount.isValid(amount)) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: discount.minAmount > amount 
            ? `Minimum amount of $${discount.minAmount} required`
            : 'Discount code is not currently valid'
        });
      }

      // Calculate discount amount
      const discountAmount = discount.calculateDiscount(amount);

      console.log(`Discount applied: ${code} - $${discountAmount} off $${amount}`);

      res.json({
        success: true,
        valid: true,
        discountAmount: discountAmount,
        description: discount.description,
        code: discount.code
      });

    } catch (error) {
      console.error('[Production MongoDB] Error applying discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply discount',
        error: error.message,
        database: 'Production MongoDB'
      });
    }
  },

  getAllDiscounts: async (req, res) => {
    try {
      const discounts = await Discount.getActiveDiscounts();

      res.json({
        success: true,
        data: discounts,
        count: discounts.length
      });
    } catch (error) {
      console.error('[Production MongoDB] Error getting discounts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get discounts',
        error: error.message
      });
    }
  }
};

module.exports = productionDiscountController;