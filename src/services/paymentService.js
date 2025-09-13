const stripe = require('../config/stripe');
const logger = require('../utils/logger');

/**
 * Create a payment intent with Stripe
 */
const createPaymentIntent = async ({
  amount,
  currency = 'cad',
  paymentMethodId,
  customer,
  metadata = {},
}) => {
  try {
    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create or retrieve customer
    let stripeCustomer = null;
    if (customer.email) {
      const existingCustomers = await stripe.customers.list({
        email: customer.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomer = existingCustomers.data[0];
      } else {
        stripeCustomer = await stripe.customers.create({
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
        });
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      customer: stripeCustomer?.id,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: process.env.FRONTEND_URL || 'http://localhost:3001',
      metadata,
    });

    return {
      success: true,
      paymentIntent,
      customer: stripeCustomer,
    };

  } catch (error) {
    logger.error('Stripe payment error:', error);
    return {
      success: false,
      message: error.message,
      error: error.code,
    };
  }
};

/**
 * Process a refund
 */
const processRefund = async (paymentIntentId, amount = null) => {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundData);

    return {
      success: true,
      refund,
    };

  } catch (error) {
    logger.error('Stripe refund error:', error);
    return {
      success: false,
      message: error.message,
      error: error.code,
    };
  }
};

/**
 * Handle Stripe webhook
 */
const handleWebhook = async (body, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    return {
      success: true,
      event,
    };

  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    return {
      success: false,
      message: 'Webhook signature verification failed',
    };
  }
};

module.exports = {
  createPaymentIntent,
  processRefund,
  handleWebhook,
};