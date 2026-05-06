const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['new-inquiry', 'follow-up-due', 'follow-up-overdue', 'inquiry-converted', 'system-alert', '24hour-reminder', 'inquiry-status-changed'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  inquiryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inquiry'
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  relatedEntityType: {
    type: String,
    enum: ['inquiry', 'service', 'user', 'system']
  },

  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  sentVia: {
    email: {
      type: Boolean,
      default: false
    },
    inApp: {
      type: Boolean,
      default: true
    }
  },
  readAt: {
    type: Date
  },
  emailedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Pre-save middleware to set readAt timestamp
notificationSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'read' && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, status: 'unread' });
};

// Static method to get recent notifications
notificationSchema.statics.getRecent = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('inquiryId', 'name email service status');
};

module.exports = mongoose.model('Notification', notificationSchema);