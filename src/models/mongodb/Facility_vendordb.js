// src/models/mongodb/Facility.js
const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  sport: { type: String, required: true },
  active: { type: Boolean, default: true }
});

const operatingHoursSchema = new mongoose.Schema({
  weekday: {
    start: { type: String, required: true }, // "08:00"
    end: { type: String, required: true }     // "20:00"
  },
  weekend: {
    start: { type: String, required: true }, // "06:00"
    end: { type: String, required: true }     // "22:00"
  }
});

const brandingSchema = new mongoose.Schema({
  primaryColor: { type: String, default: '#EB3958' },
  secondaryColor: { type: String, default: '#1E293B' },
  logoUrl: { type: String },
  faviconUrl: { type: String }
});

const pricingSchema = new mongoose.Schema({
  courtRental: { type: Number, default: 25.00 },
  serviceFeePercentage: { type: Number, default: 1.0 },
  taxPercentage: { type: Number, default: 13.0 },
  currency: { type: String, default: 'CAD' }
});

const contactSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: { type: String },
  address: {
    street: String,
    city: String,
    province: String,
    postalCode: String,
    country: { type: String, default: 'Canada' }
  }
});

const facilitySchema = new mongoose.Schema({
  // URL identifier (e.g., "vision-badminton")
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  
  // Original venue ObjectId for backward compatibility
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Venue'
  },
  
  // Basic facility information
  name: { type: String, required: true },
  description: { type: String },
  website: { type: String },
  
  // Court configuration
  courts: [courtSchema],
  totalCourts: { type: Number, required: true },
  
  // Operating configuration
  operatingHours: operatingHoursSchema,
  timezone: { type: String, default: 'America/Toronto' },
  
  // Branding and theming
  branding: brandingSchema,
  
  // Pricing configuration
  pricing: pricingSchema,
  
  // Contact information
  contact: contactSchema,
  
  // Feature flags
  features: {
    onlineBooking: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    cancellations: { type: Boolean, default: true },
    discounts: { type: Boolean, default: true }
  },
  
  // Status
  active: { type: Boolean, default: true },
  
  // Metadata
  createdBy: { type: String },
  lastModified: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
facilitySchema.index({ slug: 1 });
facilitySchema.index({ venueId: 1 });
facilitySchema.index({ active: 1 });

// Static methods
facilitySchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug.toLowerCase(), active: true });
};

facilitySchema.statics.getActiveFacilities = function() {
  return this.find({ active: true }).sort({ name: 1 });
};

// Instance methods
facilitySchema.methods.getFullAddress = function() {
  const addr = this.contact.address;
  return `${addr.street}, ${addr.city}, ${addr.province} ${addr.postalCode}`;
};

facilitySchema.methods.getOperatingHours = function(isWeekend = false) {
  return isWeekend ? this.operatingHours.weekend : this.operatingHours.weekday;
};

facilitySchema.methods.generateTimeSlots = function(isWeekend = false) {
  const hours = this.getOperatingHours(isWeekend);
  const startHour = parseInt(hours.start.split(':')[0]);
  const endHour = parseInt(hours.end.split(':')[0]);
  
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayTime = `${displayHour}:00 ${period}`;
    
    slots.push({
      time24: timeSlot,
      time12: displayTime
    });
  }
  return slots;
};

module.exports = mongoose.model('Facility', facilitySchema);