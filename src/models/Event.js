// Event model
const mongoose = require('mongoose');
const { EVENT_STATUS } = require('../config/constants');

const eventSchema = new mongoose.Schema({
  // Basic Event Info
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },

  // Date & Time
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date
  },
  timezone: {
    type: String,
    default: 'Australia/Sydney'
  },

  // Location
  venue: {
    name: String,
    address: String,
    city: {
      type: String,
      default: 'Sydney',
      index: true
    },
    state: String,
    country: {
      type: String,
      default: 'Australia'
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Categorization
  category: {
    type: String,
    index: true
  },
  tags: [{
    type: String,
    lowercase: true
  }],

  // Media
  imageUrl: String,
  images: [String],

  // Source Information
  source: {
    name: {
      type: String,
      required: true,
      index: true
    },
    url: {
      type: String,
      required: true
    },
    eventId: String
  },

  // Pricing (optional)
  price: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'AUD'
    },
    isFree: {
      type: Boolean,
      default: false
    }
  },

  // Status Management
  status: {
    type: String,
    enum: Object.values(EVENT_STATUS),
    default: EVENT_STATUS.NEW,
    index: true
  },

  // Change Tracking
  contentHash: {
    type: String,
    required: true
  },

  changeLog: [{
    field: String,
    oldValue: String,
    newValue: String,
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Scraping Metadata
  lastScraped: {
    type: Date,
    default: Date.now
  },
  firstScraped: {
    type: Date,
    default: Date.now
  },
  scrapedCount: {
    type: Number,
    default: 1
  },

  // Import Tracking (Dashboard)
  imported: {
    status: {
      type: Boolean,
      default: false
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    at: Date,
    notes: String
  },

  // Engagement Metrics
  clickCount: {
    type: Number,
    default: 0
  },
  emailCaptureCount: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

// Indexes for efficient querying
eventSchema.index({ startDate: 1, 'venue.city': 1 });
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ 'source.name': 1, lastScraped: -1 });
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index(
  { "source.name": 1, "source.eventId": 1 },
  { unique: true }
);


// Virtual for formatted date
eventSchema.virtual('formattedDate').get(function () {
  return this.startDate.toLocaleDateString('en-AU', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Method to check if event is past
eventSchema.methods.isPast = function () {
  return this.startDate < new Date();
};

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function (city = 'Sydney', limit = 50) {
  return this.find({
    'venue.city': city,
    startDate: { $gte: new Date() },
    status: { $ne: EVENT_STATUS.INACTIVE }
  })
    .sort({ startDate: 1 })
    .limit(limit);
};

module.exports = mongoose.model('Event', eventSchema);