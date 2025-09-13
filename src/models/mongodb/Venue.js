// src/models/mongodb/Venue.js - Production model matching mobile app schema
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  city: { type: String, required: true },
  country: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  postCode: { type: String, required: true },
  province: { type: String, required: true },
  street: { type: String, required: true }
}, { _id: false });

const venueSchema = new mongoose.Schema({
  about: {
    type: String,
    required: true
  },
  amenities: [{
    type: String
  }],
  availableGames: [{
    type: String
  }],
  eMail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPromoted: {
    type: Boolean,
    default: false
  },
  mobileNumber: {
    type: String,
    required: true
  },
  owner_id: {
    type: String,
    required: true
  },
  phoneCode: {
    type: String,
    required: true,
    default: '+1'
  },
  stripeUserId: {
    type: String
  },
  address: {
    type: addressSchema,
    required: true
  },
  // Web booking specific fields
  operatingHours: {
    monday: { open: { type: String, default: '08:00' }, close: { type: String, default: '20:00' } },
    tuesday: { open: { type: String, default: '08:00' }, close: { type: String, default: '20:00' } },
    wednesday: { open: { type: String, default: '08:00' }, close: { type: String, default: '20:00' } },
    thursday: { open: { type: String, default: '08:00' }, close: { type: String, default: '20:00' } },
    friday: { open: { type: String, default: '08:00' }, close: { type: String, default: '20:00' } },
    saturday: { open: { type: String, default: '06:00' }, close: { type: String, default: '22:00' } },
    sunday: { open: { type: String, default: '06:00' }, close: { type: String, default: '22:00' } }
  },
  pricePerHour: {
    type: Number,
    default: 1.00,
    min: 0
  },
  courts: {
    type: Array,
    default: [
      { id: 1, name: 'Court 1', sport: 'Badminton' },
      { id: 2, name: 'Court 2', sport: 'Badminton' },
      { id: 3, name: 'Court 2', sport: 'Badminton' },
      { id: 4, name: 'Court 2', sport: 'Badminton' },
      { id: 5, name: 'Court 2', sport: 'Badminton' },
      { id: 6, name: 'Court 2', sport: 'Badminton' },
      { id: 7, name: 'Court 2', sport: 'Badminton' },
      { id: 8, name: 'Court 2', sport: 'Badminton' },
      { id: 9, name: 'Court 2', sport: 'Badminton' },
      { id: 10, name: 'Court 2', sport: 'Badminton' }
    ]
  }
}, {
  collection: 'Venue', // Use the existing collection name
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      return ret;
    }
  },
  toObject: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      return ret;
    }
  }
});

// Indexes
venueSchema.index({ isActive: 1 });
venueSchema.index({ fullName: 'text', about: 'text' });
venueSchema.index({ 'address.city': 1, 'address.province': 1 });

// Static methods
venueSchema.statics.findActiveVenues = function() {
  return this.find({ isActive: true });
};

venueSchema.statics.findById = function(id) {
  return this.findOne({ _id: id, isActive: true });
};

// Instance methods
venueSchema.methods.getFullAddress = function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.province} ${addr.postCode}, ${addr.country}`;
};

venueSchema.methods.isOpenAt = function(dayOfWeek, time) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = days[dayOfWeek];
  const hours = this.operatingHours[day];
  
  if (!hours) return false;
  
  const openTime = hours.open;
  const closeTime = hours.close;
  
  return time >= openTime && time < closeTime;
};

module.exports = mongoose.model('Venue', venueSchema);