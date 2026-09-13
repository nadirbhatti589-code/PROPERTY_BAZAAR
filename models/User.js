const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    // Null if the user signed up via Google
    password: {
      type: String,
      minlength: 6,
      select: false, // never return password by default in queries
    },
    googleId: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'agent', 'admin'],
      default: 'buyer',
    },
    profileImage: {
      type: String,
      default: '',
    },

    // CNIC verification (optional for buyer/seller, required for agent)
    cnicNumber: {
      type: String,
      trim: true,
      default: null,
    },
    cnicVerified: {
      type: Boolean,
      default: false,
    },
    cnicDocumentUrl: {
      type: String,
      default: null,
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // adds createdAt, updatedAt automatically
);

module.exports = mongoose.model('User', UserSchema);
