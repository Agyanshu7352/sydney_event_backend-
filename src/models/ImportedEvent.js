// ImportedEvent model
const mongoose = require('mongoose');

const importedEventSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    unique: true
  },
  importedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  importedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  platformStatus: {
    type: String,
    enum: ['pending', 'published', 'featured', 'archived'],
    default: 'pending'
  },
  customizations: {
    customTitle: String,
    customDescription: String,
    customImage: String,
    featured: {
      type: Boolean,
      default: false
    },
    displayOrder: Number
  }
}, {
  timestamps: true
});

// Index for quick lookups
importedEventSchema.index({ importedBy: 1, importedAt: -1 });
importedEventSchema.index({ platformStatus: 1 });

module.exports = mongoose.model('ImportedEvent', importedEventSchema);