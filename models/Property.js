const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },

    // buy or rent
    listingType: {
      type: String,
      enum: ['buy', 'rent'],
      required: true,
    },

    // house, apartment, or plot
    category: {
      type: String,
      enum: ['house', 'apartment', 'plot'],
      required: true,
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    // For rent listings, e.g. "month", "year" — ignored for buy listings
    priceUnit: {
      type: String,
      enum: ['month', 'year', null],
      default: null,
    },

    // Location
    city: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String, // e.g. "DHA Phase 6", "Gulberg"
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    location: {
      // GeoJSON point for map + geo queries
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // Fields relevant to house/apartment (not required for plots)
    bedrooms: {
      type: Number,
      min: 0,
      default: null,
    },
    bathrooms: {
      type: Number,
      min: 0,
      default: null,
    },
    floors: {
      type: Number,
      min: 0,
      default: null,
    },

    // Area size — used by all categories
    areaSize: {
      type: Number, // numeric value
      required: true,
    },
    areaUnit: {
      type: String,
      enum: ['marla', 'kanal', 'sqft', 'sqyd'],
      default: 'sqft',
    },

    // Plot-specific field
    plotType: {
      type: String,
      enum: ['residential', 'commercial', 'agricultural', null],
      default: null,
    },

    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: null },
          order: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    videoUrl: {
      type: String,
      default: null,
    },

    amenities: {
      type: [String], // e.g. ["Parking", "Gas", "Electricity", "Water", "Security"]
      default: [],
    },

    // Who posted it
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postedByRole: {
      type: String,
      enum: ['seller', 'agent'],
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'available', 'sold', 'rented', 'expired', 'draft', 'pending_approval', 'rejected'],
      default: 'pending_approval',
    },
    isDraft: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },

    isVerified: {
      type: Boolean, // admin-verified listing (ownership/documents checked)
      default: false,
    },

    isFeatured: {
      type: Boolean, // paid/featured listing
      default: false,
    },

    views: {
      type: Number,
      default: 0,
    },
    favoriteCount: { type: Number, default: 0 },
    inquiryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index for search, geo index for map queries
PropertySchema.index({ title: 'text', description: 'text', city: 'text', area: 'text' });
PropertySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Property', PropertySchema);
