const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service selection is required']
  },
  serviceName: {
    type: String,
    required: [true, 'Service name is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  preferredTime: {
    type: String,
    required: [true, 'Preferred time is required']
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'follow-up', 'converted', 'closed'],
    default: 'new'
  },
  notes: {
    type: String,
    default: ''
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  followUpDate: {
    type: Date
  },
  convertedDate: {
    type: Date
  },
  source: {
    type: String,
    enum: ['website', 'phone', 'walk-in', 'social-media'],
    default: 'website'
  },
  notified24HourReminder: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
inquirySchema.index({ status: 1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ followUpDate: 1 });

// Virtual for days since creation
inquirySchema.virtual('daysOld').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to populate serviceName
inquirySchema.pre('save', async function(next) {
  if (this.isModified('service') || this.isNew) {
    const Service = mongoose.model('Service');
    const service = await Service.findById(this.service);
    if (service) {
      this.serviceName = service.name;
    }
  }
  next();
});

module.exports = mongoose.model('Inquiry', inquirySchema);