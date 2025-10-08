// src/controllers/mongodb/productionPaymentController.js - Updated with webhook metadata
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const productionPaymentController = {
  /**
   * Create Stripe Payment Intent with booking metadata
   * CRITICAL: Include bookingId in metadata for webhook processing
   */
  createPaymentIntent: async (req, res) => {
    try {
      const { amount, currency = 'cad', bookingId, customerEmail, customerName } = req.body;

      // console.log('Creating payment intent:', {
      //  amount,
      //  currency,
      //  bookingId,
      //  customerEmail
      // });

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      // Create or retrieve Stripe customer
      let stripeCustomer = null;
      if (customerEmail) {
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1
        });

        if (existingCustomers.data.length > 0) {
          stripeCustomer = existingCustomers.data[0];
          // console.log('Found existing Stripe customer:', stripeCustomer.id);
        } else {
          stripeCustomer = await stripe.customers.create({
            email: customerEmail,
            name: customerName,
            metadata: {
              source: 'dome_booking_web'
            }
          });
          // console.log('Created new Stripe customer:', stripeCustomer.id);
        }
      }

      // Create payment intent with metadata
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: stripeCustomer?.id,
        automatic_payment_methods: {
          enabled: true
        },
        // CRITICAL: Include metadata for webhook processing
        metadata: {
          bookingId: bookingId || 'pending',
          customerEmail: customerEmail || '',
          customerName: customerName || '',
          source: 'web_booking',
          facility: 'vision-badminton',
          timestamp: new Date().toISOString()
        },
        description: `Court booking for ${customerName || 'customer'}`,
        receipt_email: customerEmail
      });

      // console.log('Payment intent created:', paymentIntent.id);

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        customerId: stripeCustomer?.id
      });

    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: error.message
      });
    }
  },

  /**
   * Update payment intent metadata with booking ID
   * Called after booking is created
   */
  updatePaymentIntentMetadata: async (req, res) => {
    try {
      const { paymentIntentId, bookingId } = req.body;

      if (!paymentIntentId || !bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Payment Intent ID and Booking ID are required'
        });
      }

      // console.log('Updating payment intent metadata:', { paymentIntentId, bookingId });

      const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          bookingId: bookingId
        }
      });

      // console.log('Payment intent metadata updated');

      res.json({
        success: true,
        message: 'Payment intent metadata updated',
        paymentIntentId: paymentIntent.id
      });

    } catch (error) {
      console.error('Error updating payment intent metadata:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment intent metadata',
        error: error.message
      });
    }
  },

  /**
   * Process payment (legacy endpoint - webhook handles email now)
   */
  processPayment: async (req, res) => {
    try {
      const { paymentIntentId, bookingId } = req.body;

      // console.log('Processing payment:', { paymentIntentId, bookingId });

      // Verify payment intent status
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: 'Payment not completed',
          status: paymentIntent.status
        });
      }

      res.json({
        success: true,
        message: 'Payment processed successfully',
        status: paymentIntent.status,
        note: 'Confirmation email will be sent via webhook'
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment',
        error: error.message
      });
    }
  }
};

module.exports = productionPaymentController;