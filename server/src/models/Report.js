const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  reason: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: "Other"
  },
  urgency: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
reportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', reportSchema);
