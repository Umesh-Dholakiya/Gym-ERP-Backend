const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Member = require('../models/Member');
const MembershipPlan = require('../models/MembershipPlan');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const createSampleMembers = async () => {
  try {
    // Clear existing members
    await Member.deleteMany({});
    console.log('Cleared existing members');

    // Get membership plans
    const plans = await MembershipPlan.find({});
    
    if (plans.length === 0) {
      console.log('No membership plans found. Please create plans first.');
      return;
    }

    // Create sample members
    const sampleMembers = [
      {
        firstName: 'Raj',
        lastName: 'Patel',
        email: 'raj.patel@email.com',
        phone: '9876543210',
        dateOfBirth: '1990-05-15',
        gender: 'male',
        address: {
          street: '123 Main Street',
          city: 'Ahmedabad',
          state: 'Gujarat',
          zipCode: '380001'
        },
        emergencyContact: {
          name: 'Priya Patel',
          phone: '9876543211',
          relationship: 'Spouse'
        },
        fitnessGoals: ['weight-loss', 'strength'],
        medicalHistory: {
          conditions: ['None'],
          medications: ['None'],
          allergies: ['None'],
          injuries: ['None']
        },
        membership: {
          plan: plans[0]._id,
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
          status: 'active',
          paymentStatus: 'paid'
        }
      },
      {
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@email.com',
        phone: '9876543212',
        dateOfBirth: '1992-08-22',
        gender: 'female',
        address: {
          street: '456 Park Avenue',
          city: 'Surat',
          state: 'Gujarat',
          zipCode: '395001'
        },
        emergencyContact: {
          name: 'Raj Sharma',
          phone: '9876543213',
          relationship: 'Husband'
        },
        fitnessGoals: ['endurance', 'flexibility'],
        medicalHistory: {
          conditions: ['Asthma'],
          medications: ['Inhaler'],
          allergies: ['Dust'],
          injuries: ['None']
        },
        membership: {
          plan: plans[1]._id,
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          status: 'active',
          paymentStatus: 'paid'
        }
      },
      {
        firstName: 'Amit',
        lastName: 'Verma',
        email: 'amit.verma@email.com',
        phone: '9876543214',
        dateOfBirth: '1988-12-10',
        gender: 'male',
        address: {
          street: '789 College Road',
          city: 'Vadodara',
          state: 'Gujarat',
          zipCode: '390001'
        },
        emergencyContact: {
          name: 'Sunita Verma',
          phone: '9876543215',
          relationship: 'Mother'
        },
        fitnessGoals: ['muscle-gain', 'endurance'],
        medicalHistory: {
          conditions: ['Diabetes'],
          medications: ['Metformin'],
          allergies: ['Penicillin'],
          injuries: ['Knee injury (2020)']
        },
        membership: {
          plan: plans[2]._id,
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
          status: 'active',
          paymentStatus: 'pending'
        }
      }
    ];

    // Insert sample members
    await Member.insertMany(sampleMembers);
    console.log('✅ Sample members created successfully!');
    console.log(`Created ${sampleMembers.length} members`);

  } catch (error) {
    console.error('Error creating sample members:', error);
  }
};

const init = async () => {
  await connectDB();
  await createSampleMembers();
  process.exit(0);
};

init();