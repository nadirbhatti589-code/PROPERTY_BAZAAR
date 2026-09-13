const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one agent profile per user
    },
    agencyName: {
      type: String,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required for agents'],
      trim: true,
    },
    licenseDocumentUrl: {
      type: String,
      required: [true, 'License document is required'],
    },
    verifiedStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalListings: {
      type: Number,
      default: 0,
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
    serviceCities: {
      type: [String], // e.g. ["Karachi", "Lahore"]
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agent', AgentSchema);
