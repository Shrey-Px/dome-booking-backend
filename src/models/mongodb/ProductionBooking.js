// src/models/mongodb/ProductionBooking.js - Production booking model
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  venue_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Venue'
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  userId: {
    type: String,
    required: false
  },
  courtNumber: {
    type: Number,
    required: true,
    min: 1
  },
  bookingDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  duration: {
    type: Number,
    required: true,
    default: 60,
    min: 30
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discountCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'paid', 'completed', 'cancelled'],
    default: 'pending',
    required: true
  },
  paymentIntentId: {
    type: String,
    trim: true
  },
  stripeCustomerId: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    default: 'web',
    enum: ['web', 'mobile', 'admin']
  },
  notes: {
    type: String,
    trim: true
  },
  // Additional fields for mobile app compatibility
  gameType: {
    type: String,
    default: 'Badminton'
  },
  mobileBookingId: {
    type: String
  },
  syncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'Booking', // Use the existing collection name
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      ret.facilityId = ret.venue_id; // For frontend compatibility
      return ret;
    }
  },
  toObject: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      ret.facilityId = ret.venue_id; // For frontend compatibility
      return ret;
    }
  }
});

// Indexes for better query performance
bookingSchema.index({ venue_id: 1, bookingDate: 1 });
bookingSchema.index({ customerEmail: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ courtNumber: 1, bookingDate: 1, startTime: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ source: 1 });

// Static methods
bookingSchema.statics.findConflicting = function(venue_id, courtNumber, bookingDate, startTime, endTime, excludeId = null) {
  const query = {
    venue_id,
    courtNumber,
    bookingDate,
    status: { $in: ['pending', 'confirmed', 'paid', 'completed'] },
    $or: [
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } }
    ]
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return this.find(query);
};

bookingSchema.statics.getAvailabilityForDate = function(venue_id, date) {
  return this.find({
    venue_id,
    bookingDate: date,
    status: { $in: ['pending', 'confirmed', 'paid', 'completed'] }
  }).sort({ courtNumber: 1, startTime: 1 });
};

// Instance methods
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const bookingDateTime = new Date(this.bookingDate);
  const [hours, minutes] = this.startTime.split(':');
  bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const timeDiff = bookingDateTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  return hoursDiff > 2 && ['pending', 'confirmed', 'paid'].includes(this.status);
};

bookingSchema.methods.getFinalAmount = function() {
  return Math.max(0, this.totalAmount - this.discountAmount);
};

// Pre-save validation
bookingSchema.pre('save', function(next) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  if (this.bookingDate < now) {
    return next(new Error('Booking date cannot be in the past'));
  }
  
  const startHour = parseInt(this.startTime.split(':')[0]);
  const endHour = parseInt(this.endTime.split(':')[0]);
  
  if (startHour >= endHour) {
    return next(new Error('Start time must be before end time'));
  }
  
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);