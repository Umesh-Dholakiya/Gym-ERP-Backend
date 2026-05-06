const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true
  },
  features: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['membership', 'personal-training', 'group-class', 'special-offer', 'facility-access'],
    default: 'membership'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    default: ''
  },
  benefits: [{
    type: String,
    trim: true
  }],
  terms: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for better performance
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ sortOrder: 1 });

// Ensure at least one feature is provided
serviceSchema.path('features').validate(function(features) {
  return features && features.length > 0;
}, 'At least one feature is required');

module.exports = mongoose.model('Service', serviceSchema);