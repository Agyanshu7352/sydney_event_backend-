// EmailCapture model
const mongoose = require('mongoose');

const emailCaptureSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  consent: {
    type: Boolean,
    required: true,
    default: false
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  eventSnapshot: {
    title: String,
    date: Date,
    venue: String
  },
  ipAddress: String,
  userAgent: String,
  redirectedToSource: {
    type: Boolean,
    default: false
  },
  redirectedAt: Date
}, {
  timestamps: true
});

// Compound index for analytics
emailCaptureSchema.index({ event: 1, createdAt: -1 });
emailCaptureSchema.index({ email: 1, consent: 1 });

// Static method to get unique subscribers with consent
emailCaptureSchema.statics.getSubscribers = function() {
  return this.distinct('email', { consent: true });
};

module.exports = mongoose.model('EmailCapture', emailCaptureSchema);