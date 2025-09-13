const { Discount } = require('../models');
const { Op } = require('sequelize');

const discountController = {
  applyDiscount: async (req, res) => {
    try {
      console.log('🏷️ Applying discount...');
      const { code, amount } = req.body;

      if (!code || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Code and amount are required'
        });
      }

      // Find discount code
      const discount = await Discount.findOne({
        where: {
          code: code.toUpperCase(),
          active: true,
          validFrom: { [Op.lte]: new Date() },
          validUntil: { [Op.gte]: new Date() }
        }
      });

      if (!discount) {
        return res.status(404).json({
          success: false,
          valid: false,
          message: 'Invalid or expired discount code'
        });
      }

      // Check usage limit
      if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: 'Discount code has reached its usage limit'
        });
      }

      // Check minimum amount
      if (amount < discount.minAmount) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: `Minimum amount of $${discount.minAmount} required`
        });
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (discount.type === 'percentage') {
        discountAmount = (amount * discount.value) / 100;
        if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
          discountAmount = discount.maxDiscount;
        }
      } else {
        discountAmount = discount.value;
      }

      res.json({
        success: true,
        valid: true,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        description: discount.description
      });

    } catch (error) {
      console.error('❌ Error applying discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply discount',
        error: error.message
      });
    }
  },

  getAllDiscounts: async (req, res) => {
    try {
      const discounts = await Discount.findAll({
        where: { active: true }
      });

      res.json({
        success: true,
        data: discounts
      });
    } catch (error) {
      console.error('❌ Error getting discounts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get discounts',
        error: error.message
      });
    }
  }
};

module.exports = discountController;