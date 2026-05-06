const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

const createSampleServices = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if services already exist
    const existingServices = await Service.countDocuments();
    if (existingServices > 0) {
      console.log(`${existingServices} services already exist in the database!`);
      console.log('Skipping sample services creation.');
      process.exit(0);
    }

    // Sample services data
    const sampleServices = [
      {
        name: 'Monthly Membership',
        description: 'Access to all gym facilities including cardio and weight training equipment.',
        price: 49.99,
        duration: 'month',
        features: ['Full gym access', 'Locker facilities', 'Group classes', 'Towel service'],
        category: 'membership',
        isActive: true,
        sortOrder: 1,
        imageUrl: '',
        benefits: ['Unlimited access', 'Free WiFi', 'Parking', 'Guest passes']
      },
      {
        name: 'Personal Training',
        description: 'One-on-one sessions with certified personal trainers to achieve your fitness goals.',
        price: 79.99,
        duration: 'session',
        features: ['Custom workout plan', 'Nutrition guidance', 'Progress tracking', 'Goal setting'],
        category: 'personal-training',
        isActive: true,
        sortOrder: 2,
        imageUrl: '',
        benefits: ['Personalized attention', 'Proper form correction', 'Motivation', 'Results guarantee']
      },
      {
        name: 'Group Classes',
        description: 'Join our exciting group fitness classes led by experienced instructors.',
        price: 15.00,
        duration: 'class',
        features: ['Yoga', 'Zumba', 'HIIT', 'Spin classes'],
        category: 'group-class',
        isActive: true,
        sortOrder: 3,
        imageUrl: '',
        benefits: ['Fun workouts', 'Community support', 'Variety', 'Expert instruction']
      },
      {
        name: 'Free Trial Session',
        description: 'Experience our facilities with a complimentary trial session.',
        price: 0.00,
        duration: 'session',
        features: ['Gym tour', 'Equipment orientation', 'Trial workout', 'Consultation'],
        category: 'special-offer',
        isActive: true,
        sortOrder: 4,
        imageUrl: '',
        benefits: ['No commitment', 'Meet trainers', 'Try facilities', 'Learn programs']
      },
      {
        name: 'Nutrition Consultation',
        description: 'Get personalized nutrition advice from our certified dietitians.',
        price: 59.99,
        duration: 'session',
        features: ['Diet assessment', 'Meal planning', 'Supplement guidance', 'Follow-up'],
        category: 'special-offer',
        isActive: true,
        sortOrder: 5,
        imageUrl: '',
        benefits: ['Custom meal plans', 'Healthy recipes', 'Weight management', 'Energy boost']
      }
    ];

    // Create sample services
    await Service.insertMany(sampleServices);
    console.log('✅ Sample services created successfully!');
    
    const createdServices = await Service.find();
    console.log('📋 Created services:');
    createdServices.forEach(service => {
      console.log(`- ${service.name}: $${service.price}/${service.duration}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample services:', error);
    process.exit(1);
  }
};

createSampleServices();