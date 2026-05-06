const mongoose = require('mongoose');

const classScheduleSchema = new mongoose.Schema({
  className: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    maxlength: [100, 'Class name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
    required: [true, 'Trainer is required']
  },
  category: {
    type: String,
    enum: [
      'strength', 'cardio', 'yoga', 'pilates', 'crossfit',
      'hiit', 'zumba', 'boxing', 'cycling', 'stretching',
      'personal-training', 'group-training', 'kids-class'
    ],
    required: [true, 'Category is required']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  schedule: {
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: [true, 'Day of week is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'], // HH:MM format
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'], // HH:MM format
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    }
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [100, 'Capacity cannot exceed 100']
  },
  enrolledMembers: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['confirmed', 'attended', 'cancelled', 'no-show'],
      default: 'confirmed'
    }
  }],
  fee: {
    type: Number,
    required: [true, 'Fee is required'],
    min: [0, 'Fee cannot be negative']
  },
  room: {
    type: String,
    trim: true,
    maxlength: [50, 'Room name cannot exceed 50 characters']
  },
  equipmentRequired: [{
    type: String,
    maxlength: [100, 'Equipment name cannot exceed 100 characters']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
classScheduleSchema.index({ 'schedule.dayOfWeek': 1, 'schedule.startTime': 1 });
classScheduleSchema.index({ trainer: 1 });
classScheduleSchema.index({ category: 1 });

// Virtual for current enrollment count
classScheduleSchema.virtual('currentEnrollment').get(function() {
  return this.enrolledMembers ? this.enrolledMembers.length : 0;
});

// Virtual for available spots
classScheduleSchema.virtual('availableSpots').get(function() {
  return this.capacity - this.currentEnrollment;
});

// Virtual for duration in minutes
classScheduleSchema.virtual('duration').get(function() {
  if (!this.schedule.startTime || !this.schedule.endTime) return 0;
  
  const [startHours, startMinutes] = this.schedule.startTime.split(':').map(Number);
  const [endHours, endMinutes] = this.schedule.endTime.split(':').map(Number);
  
  const startTime = startHours * 60 + startMinutes;
  const endTime = endHours * 60 + endMinutes;
  
  return endTime >= startTime ? endTime - startTime : (24 * 60) - startTime + endTime;
});

// Pre-save hook to validate time
classScheduleSchema.pre('save', function(next) {
  if (this.schedule.startTime && this.schedule.endTime) {
    const [startHours, startMinutes] = this.schedule.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.schedule.endTime.split(':').map(Number);
    
    const startTime = startHours * 60 + startMinutes;
    const endTime = endHours * 60 + endMinutes;
    
    if (endTime <= startTime) {
      return next(new Error('End time must be after start time'));
    }
  }
  next();
});

// Ensure virtual fields are serialized
classScheduleSchema.set('toJSON', { virtuals: true });
classScheduleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ClassSchedule', classScheduleSchema);