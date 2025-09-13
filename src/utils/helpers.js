const crypto = require('crypto');

/**
 * Generate a random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Calculate booking duration in minutes
 */
const calculateDuration = (startTime, endTime) => {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startInMinutes = startHour * 60 + startMinute;
  const endInMinutes = endHour * 60 + endMinute;
  
  return endInMinutes - startInMinutes;
};

/**
 * Format currency
 */
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Check if time slot conflicts with existing booking
 */
const checkTimeConflict = (newStart, newEnd, existingStart, existingEnd) => {
  const newStartTime = new Date(`2000-01-01T${newStart}`);
  const newEndTime = new Date(`2000-01-01T${newEnd}`);
  const existingStartTime = new Date(`2000-01-01T${existingStart}`);
  const existingEndTime = new Date(`2000-01-01T${existingEnd}`);
  
  return (newStartTime < existingEndTime && newEndTime > existingStartTime);
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

module.exports = {
  generateRandomString,
  calculateDuration,
  formatCurrency,
  checkTimeConflict,
  sanitizeInput,
};