// src/utils/pricing.js - Centralized pricing calculation
// This ensures consistent pricing across frontend and makes updates easy

/**
 * Calculate booking price breakdown
 * @param {Object} facility - Facility object with pricing configuration
 * @param {number} duration - Booking duration in minutes (default: 60)
 * @param {number} discountAmount - Discount amount in dollars (default: 0)
 * @returns {Object} Price breakdown with all components
 */
export const calculateBookingPrice = (facility, duration = 60, discountAmount = 0) => {
  if (!facility || !facility.pricing) {
    throw new Error('Facility pricing configuration is required');
  }

  const { courtRental, serviceFeePercentage, taxPercentage } = facility.pricing;

  // Calculate based on duration (court rental is per hour)
  const hourlyRate = courtRental;
  const durationInHours = duration / 60;
  const totalCourtRental = hourlyRate * durationInHours;

  // Service fee is calculated on court rental amount
  const serviceFee = totalCourtRental * (serviceFeePercentage / 100);

  // Subtotal after discount
  const subtotalBeforeTax = totalCourtRental + serviceFee - discountAmount;

  // Tax is calculated on subtotal
  const tax = subtotalBeforeTax * (taxPercentage / 100);

  // Final total
  const finalTotal = subtotalBeforeTax + tax;

  return {
    courtRental: parseFloat(totalCourtRental.toFixed(2)),
    serviceFee: parseFloat(serviceFee.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    subtotal: parseFloat(subtotalBeforeTax.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    finalTotal: parseFloat(finalTotal.toFixed(2)),
    // Additional metadata
    hourlyRate,
    duration,
    serviceFeePercentage,
    taxPercentage,
    currency: facility.pricing.currency || 'CAD'
  };
};

/**
 * Calculate discount amount from a discount object
 * @param {Object} discount - Discount object with type and value
 * @param {number} baseAmount - Base amount to apply discount to
 * @returns {number} Discount amount in dollars
 */
export const calculateDiscountAmount = (discount, baseAmount) => {
  if (!discount || !discount.isActive) {
    return 0;
  }

  if (discount.discountType === 'percentage') {
    return (baseAmount * discount.discountValue) / 100;
  } else if (discount.discountType === 'fixed') {
    return Math.min(discount.discountValue, baseAmount); // Don't exceed base amount
  }

  return 0;
};

/**
 * Format price for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'CAD')
 * @returns {string} Formatted price string
 */
export const formatPrice = (amount, currency = 'CAD') => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Validate pricing calculation
 * @param {Object} pricing - Pricing breakdown object
 * @returns {boolean} True if pricing is valid
 */
export const validatePricing = (pricing) => {
  // Check for negative values
  if (pricing.courtRental < 0 || pricing.serviceFee < 0 || 
      pricing.tax < 0 || pricing.finalTotal < 0) {
    return false;
  }

  // Check if calculations match
  const calculatedSubtotal = pricing.courtRental + pricing.serviceFee - pricing.discountAmount;
  const calculatedTax = calculatedSubtotal * (pricing.taxPercentage / 100);
  const calculatedTotal = calculatedSubtotal + calculatedTax;

  const tolerance = 0.01; // Allow 1 cent rounding difference

  if (Math.abs(pricing.subtotal - calculatedSubtotal) > tolerance) {
    return false;
  }

  if (Math.abs(pricing.tax - calculatedTax) > tolerance) {
    return false;
  }

  if (Math.abs(pricing.finalTotal - calculatedTotal) > tolerance) {
    return false;
  }

  return true;
};

/**
 * Get price summary text for display
 * @param {Object} pricing - Pricing breakdown object
 * @returns {string} Human-readable price summary
 */
export const getPriceSummary = (pricing) => {
  const lines = [
    `Court Rental: ${formatPrice(pricing.courtRental, pricing.currency)}`,
    `Service Fee (${pricing.serviceFeePercentage}%): ${formatPrice(pricing.serviceFee, pricing.currency)}`
  ];

  if (pricing.discountAmount > 0) {
    lines.push(`Discount: -${formatPrice(pricing.discountAmount, pricing.currency)}`);
  }

  lines.push(`Subtotal: ${formatPrice(pricing.subtotal, pricing.currency)}`);
  lines.push(`Tax (${pricing.taxPercentage}%): ${formatPrice(pricing.tax, pricing.currency)}`);
  lines.push(`Total: ${formatPrice(pricing.finalTotal, pricing.currency)}`);

  return lines.join('\n');
};

export default {
  calculateBookingPrice,
  calculateDiscountAmount,
  formatPrice,
  validatePricing,
  getPriceSummary
};