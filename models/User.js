const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  current_token: {
    type: String,
    default: null
  },
  confirmationToken: String,
  confirmationExpires: Date,
  // Keep legacy fields for backward compat with existing users
  verification_otp: String,
  otp_expires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
