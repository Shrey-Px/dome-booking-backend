// src/models/mongodb/Facility.js
const mongoose = require('mongoose');

const operatingHoursSchema = new mongoose.Schema({
  monday: { open: String, close: String },
  tuesday: { open: String, close: String },
  wednesday: { open: String, close: String },
  thursday: { open: String, close: String },
  friday: { open: String, close: String },
  saturday: { open: String, close: String },
  sunday: { open: String, close: String }
}, { _id: false });

const courtSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  sport: { type: String, default: 'Badminton' }
}, { _id: false });

const facilitySchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => require('uuid').v4(),
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  courts: {
    type: [courtSchema],
    required: true,
    default: []
  },
  operatingHours: {
    type: operatingHoursSchema,
    required: false
  },
  pricePerHour: {
    type: Number,
    required: true,
    default: 25.00,
    min: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  collection: 'facilities',
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

// Add indexes
facilitySchema.index({ slug: 1 });
facilitySchema.index({ active: 1 });

// Static methods
facilitySchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug, active: true });
};

// Instance methods
facilitySchema.methods.getActiveBookings = function(date) {
  const Booking = mongoose.model('Booking');
  return Booking.find({
    facilityId: this._id,
    bookingDate: date,
    status: { $in: ['pending', 'paid', 'completed'] }
  });
};

module.exports = mongoose.model('Facility', facilitySchema);