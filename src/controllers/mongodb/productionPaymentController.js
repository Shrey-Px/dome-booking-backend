// src/controllers/mongodb/productionPaymentController.js
const stripe = require('../../config/stripe');
const Booking = require('../../models/mongodb/ProductionBooking');
const logger = require('../../utils/logger');

const productionPaymentController = {
  createPaymentIntent: async (req, res) => {
    try {
      console.log('[Production MongoDB] Creating payment intent...');
      console.log('Request body:', req.body);
      
      const { amount, currency = 'cad' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      console.log('Creating payment intent for amount:', amount, currency);

      // Convert amount to cents for Stripe
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          source: 'web_booking_production',
          database: 'MongoDB'
        }
      });

      console.log('[Production MongoDB] Payment intent created:', paymentIntent.id);

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });

    } catch (error) {
      console.error('[Production MongoDB] Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: error.message,
        database: 'Production MongoDB'
      });
    }
  },

  processPayment: async (req, res) => {
    try {
      console.log('[Production MongoDB] Processing payment...');
      const { bookingId, paymentIntentId, amount } = req.body;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required'
        });
      }

      // Update booking with payment information using direct collection update
      const db = require('mongoose').connection.db;
      
      const updateResult = await db.collection('Booking').updateOne(
        { _id: new require('mongodb').ObjectId(bookingId) },
        { 
          $set: {
            paymentIntentId: paymentIntentId,
            paymentIntentStatus: 'Success', // Mobile app uses this format
            paymentIntentUpdated: new Date().toISOString(),
            bookingStatus: 'Booked' // Ensure status is set to mobile app format
          }
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Get updated booking
      const updatedBooking = await db.collection('Booking').findOne(
        { _id: new require('mongodb').ObjectId(bookingId) }
      );

      console.log('[Production MongoDB] Payment processed for booking:', bookingId);

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: updatedBooking
      });

    } catch (error) {
      console.error('[Production MongoDB] Error processing payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment',
        error: error.message,
        database: 'Production MongoDB'
      });
    }
  },

  handleWebhook: async (req, res) => {
    try {
      console.log('[Production MongoDB] Webhook received...');
      
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        console.error('[Production MongoDB] Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('[Production MongoDB] Payment succeeded:', paymentIntent.id);
          
          // Update booking status if needed
          const booking = await Booking.findOne({ paymentIntentId: paymentIntent.id });
          if (booking && booking.status === 'pending') {
            booking.status = 'paid';
            await booking.save();
            console.log('[Production MongoDB] Booking status updated to paid:', booking._id);
          }
          break;
          
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          console.log('[Production MongoDB] Payment failed:', failedPayment.id);
          break;
          
        default:
          console.log('[Production MongoDB] Unhandled event type:', event.type);
      }

      res.json({ success: true, received: true });
      
    } catch (error) {
      console.error('[Production MongoDB] Webhook error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};

module.exports = productionPaymentController;