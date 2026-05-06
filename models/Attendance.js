const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  sessionDuration: {
    type: Number, // in minutes
    default: 0
  },
  checkInMethod: {
    type: String,
    enum: ['qr-code', 'manual', 'biometric', 'mobile-app'],
    default: 'manual'
  },
  checkOutMethod: {
    type: String,
    enum: ['qr-code', 'manual', 'biometric', 'mobile-app', 'auto-expired'],
    default: null
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
attendanceSchema.index({ member: 1, date: -1 });
attendanceSchema.index({ date: 1, checkInTime: 1 });

// Calculate session duration before saving
attendanceSchema.pre('save', function(next) {
  if (this.checkOutTime && this.checkInTime) {
    const durationMs = this.checkOutTime.getTime() - this.checkInTime.getTime();
    this.sessionDuration = Math.round(durationMs / 60000); // Convert to minutes
  }
  next();
});

// Static method to get daily attendance stats
attendanceSchema.statics.getDailyStats = async function(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const stats = await this.aggregate([
    {
      $match: {
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }
    },
    {
      $group: {
        _id: null,
        totalCheckIns: { $sum: 1 },
        averageSessionMinutes: { $avg: '$sessionDuration' },
        activeMembers: {
          $sum: {
            $cond: [{ $eq: ['$checkOutTime', null] }, 1, 0]
          }
        }
      }
    }
  ]);

  return stats[0] || { totalCheckIns: 0, averageSessionMinutes: 0, activeMembers: 0 };
};

module.exports = mongoose.model('Attendance', attendanceSchema);