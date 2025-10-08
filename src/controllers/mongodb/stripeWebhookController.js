// src/controllers/mongodb/stripeWebhookController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ObjectId } = require('mongodb');
const emailService = require('../../services/emailService');

const stripeWebhookController = {
  /**
   * Handle Stripe webhook events
   * This ensures reliable email delivery even if frontend loses connection
   */
  handleWebhook: async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      // console.log('✅ Webhook signature verified:', event.type);
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;

        case 'payment_intent.canceled':
          await handlePaymentCanceled(event.data.object);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object);
          break;

        default:
          // console.log(`Unhandled event type: ${event.type}`);
      }

      // Return success response to Stripe
      res.json({ received: true });

    } catch (error) {
      console.error('Error processing webhook:', error);
      // Still return 200 to prevent Stripe from retrying
      // Log error for manual investigation
      res.status(200).json({ 
        received: true, 
        error: 'Processing failed but acknowledged' 
      });
    }
  }
};

/**
 * Handle successful payment
 * This is the critical path for email delivery
 */
async function handlePaymentSucceeded(paymentIntent) {
  // console.log('💳 Payment succeeded:', paymentIntent.id);
  // console.log('Metadata:', paymentIntent.metadata);

  const bookingId = paymentIntent.metadata.bookingId;
  
  if (!bookingId) {
    console.error('⚠️ No bookingId in payment intent metadata');
    return;
  }

  try {
    const db = require('mongoose').connection.db;
    
    // Find the booking
    const booking = await db.collection('Booking').findOne({ 
      _id: new ObjectId(bookingId) 
    });

    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return;
    }

    // console.log('📋 Found booking:', {
    //  id: booking._id,
    //  customer: booking.customerName,
    //  court: booking.fieldName,
    //  status: booking.paymentIntentStatus
    // });

    // Check if email already sent (idempotency)
    if (booking.confirmationEmailSent) {
      // console.log('✉️ Confirmation email already sent, skipping');
      return;
    }

    // Update booking status to paid
    await db.collection('Booking').updateOne(
      { _id: new ObjectId(bookingId) },
      { 
        $set: { 
          paymentIntentStatus: 'Success',
          paymentIntentId: paymentIntent.id,
          paidAt: new Date(),
          stripeWebhookProcessed: true,
          stripeWebhookProcessedAt: new Date()
        } 
      }
    );

    // console.log('✅ Booking status updated to Success');

    // Send confirmation email
    const emailData = {
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      facilityName: 'Vision Badminton Centre', // TODO: Get from facility
      courtName: booking.fieldName,
      bookingDate: booking.bookingDateString || booking.bookingDate,
      startTime: booking.startTimeString || booking.startTime,
      endTime: booking.endTimeString || booking.endTime,
      duration: 60,
      courtRental: booking.price?.$numberDecimal || '25.00',
      serviceFee: booking.serviceFee?.$numberDecimal || '0.25',
      discountAmount: booking.discount?.$numberDecimal || '0.00',
      subtotal: booking.subtotal?.$numberDecimal || '25.25',
      tax: booking.tax?.$numberDecimal || '3.28',
      totalAmount: booking.totalPrice?.$numberDecimal || '28.53',
      bookingId: booking._id.toString(),
      cancelUrl: `${process.env.FRONTEND_URL}/vision-badminton/cancel-booking?id=${booking._id.toString()}`
    };

    // console.log('📧 Sending confirmation email to:', emailData.customerEmail);

    const emailResult = await emailService.sendBookingConfirmation(emailData);

    if (emailResult.error) {
      console.error('❌ Failed to send email:', emailResult.error);
      
      // Mark email as failed for retry
      await db.collection('Booking').updateOne(
        { _id: new ObjectId(bookingId) },
        { 
          $set: { 
            confirmationEmailFailed: true,
            confirmationEmailError: emailResult.error,
            confirmationEmailAttempts: 1
          } 
        }
      );
    } else {
      // console.log('✅ Confirmation email sent successfully');
      
      // Mark email as sent
      await db.collection('Booking').updateOne(
        { _id: new ObjectId(bookingId) },
        { 
          $set: { 
            confirmationEmailSent: true,
            confirmationEmailSentAt: new Date(),
            confirmationEmailMessageId: emailResult.messageId
          } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Error in handlePaymentSucceeded:', error);
    throw error; // Re-throw to be caught by main handler
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent) {
  // console.log('❌ Payment failed:', paymentIntent.id);
  
  const bookingId = paymentIntent.metadata.bookingId;
  if (!bookingId) return;

  try {
    const db = require('mongoose').connection.db;
    
    await db.collection('Booking').updateOne(
      { _id: new ObjectId(bookingId) },
      { 
        $set: { 
          paymentIntentStatus: 'Failed',
          paymentFailureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
          paymentFailedAt: new Date()
        } 
      }
    );

    // console.log('📝 Booking marked as payment failed');

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(paymentIntent) {
  // console.log('🚫 Payment canceled:', paymentIntent.id);
  
  const bookingId = paymentIntent.metadata.bookingId;
  if (!bookingId) return;

  try {
    const db = require('mongoose').connection.db;
    
    await db.collection('Booking').updateOne(
      { _id: new ObjectId(bookingId) },
      { 
        $set: { 
          paymentIntentStatus: 'Canceled',
          paymentCanceledAt: new Date()
        } 
      }
    );

    // console.log('📝 Booking marked as payment canceled');

  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
}

/**
 * Handle refund
 */
async function handleChargeRefunded(charge) {
  // console.log('💰 Charge refunded:', charge.id);
  
  const paymentIntentId = charge.payment_intent;
  if (!paymentIntentId) return;

  try {
    const db = require('mongoose').connection.db;
    
    // Find booking by payment intent ID
    const booking = await db.collection('Booking').findOne({ 
      paymentIntentId: paymentIntentId 
    });

    if (!booking) {
      // console.log('No booking found for payment intent:', paymentIntentId);
      return;
    }

    // Update booking status
    await db.collection('Booking').updateOne(
      { _id: booking._id },
      { 
        $set: { 
          paymentIntentStatus: 'Refunded',
          refundedAt: new Date(),
          refundAmount: charge.amount_refunded / 100 // Convert from cents
        } 
      }
    );

    // console.log('✅ Booking marked as refunded');

    // Optionally send refund confirmation email
    // await emailService.sendRefundConfirmation(...)

  } catch (error) {
    console.error('Error handling refund:', error);
  }
}

module.exports = stripeWebhookController;