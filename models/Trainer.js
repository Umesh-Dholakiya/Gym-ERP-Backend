const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Gender is required']
  },
  specialization: [{
    type: String,
    enum: [
      'strength-training', 'cardio', 'yoga', 'crossfit', 
      'bodybuilding', 'functional-fitness', 'sports-conditioning',
      'weight-loss', 'rehabilitation', 'nutrition'
    ]
  }],
  certifications: [{
    name: {
      type: String,
      required: true
    },
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    certificateNumber: String
  }],
  experience: {
    years: {
      type: Number,
      min: 0,
      default: 0
    },
    previousGyms: [{
      gymName: String,
      position: String,
      startDate: Date,
      endDate: Date
    }]
  },
  availability: {
    monday: {
      startTime: String, // HH:MM format
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    },
    tuesday: {
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    },
    wednesday: {
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    },
    thursday: {
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    },
    friday: {
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    },
    saturday: {
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: false
      }
    },
    sunday: {
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: false
      }
    }
  },
  hourlyRate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [0, 'Hourly rate cannot be negative']
  },
  commissionRate: {
    type: Number,
    default: 10, // Percentage
    min: [0, 'Commission rate cannot be negative'],
    max: [100, 'Commission rate cannot exceed 100%']
  },
  photo: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinDate: {
    type: Date,
    default: Date.now
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

// Index for search optimization
trainerSchema.index({ firstName: 1, lastName: 1 });
trainerSchema.index({ email: 1 });
trainerSchema.index({ phone: 1 });
trainerSchema.index({ specialization: 1 });

// Virtual for full name
trainerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
trainerSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Ensure virtual fields are serialized
trainerSchema.set('toJSON', { virtuals: true });
trainerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Trainer', trainerSchema);