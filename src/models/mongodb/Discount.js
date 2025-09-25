// src/models/mongodb/Discount.js
const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => require('uuid').v4(),
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed'],
    lowercase: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  minAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscount: {
    type: Number,
    min: 0
  },
  usageLimit: {
    type: Number,
    min: 0
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  // Additional fields for better management
  createdBy: {
    type: String
  },
  applicableServices: {
    type: [String],
    enum: ['court_booking', 'membership', 'equipment'],
    default: ['court_booking']
  }
}, {
  collection: 'discounts',
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
discountSchema.index({ active: 1 });
discountSchema.index({ validFrom: 1, validUntil: 1 });
discountSchema.index({ createdAt: -1 });

// Static methods
discountSchema.statics.findValidDiscount = function(code, amount = 0) {
  const now = new Date();
  return this.findOne({
    code: code.toUpperCase(),
    active: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    minAmount: { $lte: amount },
    $or: [
      { usageLimit: { $exists: false } },
      { usageLimit: null },
      { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
    ]
  });
};

discountSchema.statics.getActiveDiscounts = function() {
  const now = new Date();
  return this.find({
    active: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  }).sort({ createdAt: -1 });
};

// Instance methods
discountSchema.methods.calculateDiscount = function(amount) {
  if (amount < this.minAmount) {
    return 0;
  }

  let discountAmount = 0;
  
  if (this.type === 'percentage') {
    discountAmount = (amount * this.value) / 100;
    if (this.maxDiscount && discountAmount > this.maxDiscount) {
      discountAmount = this.maxDiscount;
    }
  } else if (this.type === 'fixed') {
    discountAmount = Math.min(this.value, amount);
  }

  return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
};

discountSchema.methods.isValid = function(amount = 0) {
  const now = new Date();
  
  // Check if discount is active
  if (!this.active) return false;
  
  // Check date validity
  if (now < this.validFrom || now > this.validUntil) return false;
  
  // Check minimum amount
  if (amount < this.minAmount) return false;
  
  // Check usage limit
  if (this.usageLimit && this.usedCount >= this.usageLimit) return false;
  
  return true;
};

discountSchema.methods.canBeUsed = function() {
  return this.isValid() && (!this.usageLimit || this.usedCount < this.usageLimit);
};

discountSchema.methods.incrementUsage = function() {
  this.usedCount += 1;
  return this.save();
};

// Pre-save validation
discountSchema.pre('save', function(next) {
  // Ensure validUntil is after validFrom
  if (this.validUntil <= this.validFrom) {
    return next(new Error('Valid until date must be after valid from date'));
  }
  
  // Ensure percentage discounts don't exceed 100%
  if (this.type === 'percentage' && this.value > 100) {
    return next(new Error('Percentage discount cannot exceed 100%'));
  }
  
  // Ensure usedCount doesn't exceed usageLimit
  if (this.usageLimit && this.usedCount > this.usageLimit) {
    return next(new Error('Used count cannot exceed usage limit'));
  }
  
  next();
});

module.exports = mongoose.model('Discount', discountSchema);