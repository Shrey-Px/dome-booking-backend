const { body, query, param } = require('express-validator');

const bookingValidation = [
  body('facilityId').isUUID().withMessage('Valid facility ID is required'),
  body('customerName').trim().isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2-100 characters'),
  body('customerEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('customerPhone').optional().isMobilePhone().withMessage('Valid phone number is required'),
  body('courtNumber').isInt({ min: 1 }).withMessage('Valid court number is required'),
  body('bookingDate').isDate().withMessage('Valid booking date is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM format)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM format)'),
  body('source').isIn(['web', 'mobile', 'admin']).withMessage('Valid source is required'),
];

const availabilityValidation = [
  query('facility_id').isUUID().withMessage('Valid facility ID is required'),
  query('date').isDate().withMessage('Valid date is required'),
];

const discountValidation = [
  body('code').trim().isLength({ min: 3, max: 20 }).withMessage('Discount code must be between 3-20 characters'),
];

const facilityParamValidation = [
  param('facilitySlug').trim().isLength({ min: 1 }).withMessage('Facility slug is required'),
];

module.exports = {
  bookingValidation,
  availabilityValidation,
  discountValidation,
  facilityParamValidation,
};