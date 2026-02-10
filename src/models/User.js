// src/models/User.js - COMPLETE FIXED VERSION
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: [true, 'Google ID is required'],
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    default: 'User', 
  },
  picture: {  
    type: String,
    default: null,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'admin', // Set to 'admin' so users can access dashboard
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

// Method to get user's safe data (without sensitive fields)
userSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    picture: this.picture,  // ✅ Changed from 'avatar' to 'picture'
    role: this.role,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;