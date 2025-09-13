// src/controllers/paymentController.js - Fixed version
const stripe = require('../config/stripe');
const { Booking } = require('../models');
const logger = require('../utils/logger');

const paymentController = {
  createPaymentIntent: async (req, res) => {
    try {
      console.log('💳 Creating payment intent...');
      console.log('Request body:', req.body);
      
      const { amount, currency = 'cad' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      console.log('💰 Creating payment intent for amount:', amount, currency);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Stripe expects amount in cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          source: 'web_booking'
        }
      });

      console.log('✅ Payment intent created:', paymentIntent.id);

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });

    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: error.message
      });
    }
  },

  processPayment: async (req, res) => {
    try {
      console.log('💰 Processing payment...');
      const { bookingId, paymentIntentId, amount } = req.body;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required'
        });
      }

      // Update booking with payment information
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      await booking.update({
        paymentIntentId,
        status: 'paid'
      });

      console.log('✅ Payment processed for booking:', bookingId);

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: booking
      });

    } catch (error) {
      console.error('❌ Error processing payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment',
        error: error.message
      });
    }
  },

  handleWebhook: async (req, res) => {
    try {
      console.log('🎣 Webhook received...');
      // Webhook handling logic here
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ success: false });
    }
  }
};

module.exports = paymentController;