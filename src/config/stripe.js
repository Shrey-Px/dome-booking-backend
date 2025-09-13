// src/config/stripe.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

console.log('🔧 Stripe configured with key:', process.env.STRIPE_SECRET_KEY ? 'Key present' : 'Key missing');

module.exports = stripe;