const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  duration: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['day', 'week', 'month', 'year'],
      required: true
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  features: [{
    type: String
  }],
  benefits: [{
    type: String
  }],
  limitations: [{
    type: String
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

// Predefined plans
membershipPlanSchema.statics.getDefaultPlans = function() {
  return [
    {
      name: 'Basic Monthly',
      description: 'Perfect for beginners looking to start their fitness journey',
      duration: { value: 1, unit: 'month' },
      price: 1500,
      features: ['Access to gym facilities', 'Basic equipment usage', 'Locker room access'],
      benefits: ['Flexible monthly commitment', 'No long-term contracts'],
      limitations: ['No personal training sessions', 'Limited class access']
    },
    {
      name: 'Premium Monthly',
      description: 'Ideal for serious fitness enthusiasts',
      duration: { value: 1, unit: 'month' },
      price: 2500,
      features: ['Full gym access', 'All group classes', 'Personal locker', 'Free Wi-Fi'],
      benefits: ['1 free personal training session/month', 'Nutrition consultation'],
      limitations: []
    },
    {
      name: 'Quarterly Plan',
      description: 'Best value for committed members',
      duration: { value: 3, unit: 'month' },
      price: 6500, // Discounted rate
      features: ['All Premium features', 'Priority booking', 'Guest passes (2/month)'],
      benefits: ['10% savings compared to monthly', '2 free PT sessions', 'Monthly progress photos'],
      limitations: []
    },
    {
      name: 'Annual Plan',
      description: 'Maximum value for dedicated members',
      duration: { value: 12, unit: 'month' },
      price: 24000, // Best discount
      features: ['All Quarterly features', 'VIP lounge access', 'Complimentary smoothie'],
      benefits: ['30% savings', '4 free PT sessions', 'Annual health assessment', 'Free merchandise'],
      limitations: []
    }
  ];
};

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);