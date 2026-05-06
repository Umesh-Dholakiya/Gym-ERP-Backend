const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Trainer = require('../models/Trainer');

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

const createSampleTrainers = async () => {
  try {
    // Clear existing trainers
    await Trainer.deleteMany({});
    console.log('Cleared existing trainers');

    // Create sample trainers
    const sampleTrainers = [
      {
        firstName: 'Rajesh',
        lastName: 'Patel',
        email: 'rajesh.patel@gym.com',
        phone: '9876543210',
        dateOfBirth: '1985-03-15',
        gender: 'male',
        specialization: ['weight-loss', 'strength-training'],
        hourlyRate: 500,
        commissionRate: 15,
        photo: '/images/trainer1.jpg',
        experience: {
          years: 8,
          previousGyms: [
            {
              gymName: 'Fitness World Ahmedabad',
              position: 'Senior Trainer',
              startDate: '2018-01-01',
              endDate: '2022-12-31'
            }
          ]
        },
        availability: {
          monday: { isAvailable: true, startTime: '06:00', endTime: '22:00' },
          tuesday: { isAvailable: true, startTime: '06:00', endTime: '22:00' },
          wednesday: { isAvailable: true, startTime: '06:00', endTime: '22:00' },
          thursday: { isAvailable: true, startTime: '06:00', endTime: '22:00' },
          friday: { isAvailable: true, startTime: '06:00', endTime: '22:00' },
          saturday: { isAvailable: true, startTime: '08:00', endTime: '20:00' },
          sunday: { isAvailable: false }
        },
        bio: 'Certified personal trainer with 8 years of experience specializing in weight loss and strength training. Passionate about helping clients achieve their fitness goals.',
        isActive: true
      },
      {
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@gym.com',
        phone: '9876543211',
        dateOfBirth: '1990-07-22',
        gender: 'female',
        specialization: ['cardio', 'yoga'],
        hourlyRate: 450,
        commissionRate: 12,
        photo: '/images/trainer2.jpg',
        experience: {
          years: 5,
          previousGyms: [
            {
              gymName: 'Gold\'s Gym Surat',
              position: 'Yoga Instructor',
              startDate: '2019-06-01',
              endDate: '2023-05-31'
            }
          ]
        },
        availability: {
          monday: { isAvailable: true, startTime: '05:00', endTime: '21:00' },
          tuesday: { isAvailable: true, startTime: '05:00', endTime: '21:00' },
          wednesday: { isAvailable: true, startTime: '05:00', endTime: '21:00' },
          thursday: { isAvailable: true, startTime: '05:00', endTime: '21:00' },
          friday: { isAvailable: true, startTime: '05:00', endTime: '21:00' },
          saturday: { isAvailable: true, startTime: '07:00', endTime: '19:00' },
          sunday: { isAvailable: true, startTime: '08:00', endTime: '16:00' }
        },
        bio: 'Experienced yoga and cardio fitness instructor with 5 years of teaching experience. Specializes in flexibility training and stress reduction techniques.',
        isActive: true
      },
      {
        firstName: 'Amit',
        lastName: 'Verma',
        email: 'amit.verma@gym.com',
        phone: '9876543212',
        dateOfBirth: '1982-11-10',
        gender: 'male',
        specialization: ['bodybuilding', 'nutrition'],
        hourlyRate: 600,
        commissionRate: 18,
        photo: '/images/trainer3.jpg',
        experience: {
          years: 12,
          previousGyms: [
            {
              gymName: 'BodyFit Vadodara',
              position: 'Head Trainer',
              startDate: '2012-01-01',
              endDate: '2020-12-31'
            },
            {
              gymName: 'Muscle Factory Mumbai',
              position: 'Senior Bodybuilding Coach',
              startDate: '2021-01-01',
              endDate: '2023-12-31'
            }
          ]
        },
        availability: {
          monday: { isAvailable: true, startTime: '07:00', endTime: '21:00' },
          tuesday: { isAvailable: true, startTime: '07:00', endTime: '21:00' },
          wednesday: { isAvailable: true, startTime: '07:00', endTime: '21:00' },
          thursday: { isAvailable: true, startTime: '07:00', endTime: '21:00' },
          friday: { isAvailable: true, startTime: '07:00', endTime: '21:00' },
          saturday: { isAvailable: true, startTime: '09:00', endTime: '18:00' },
          sunday: { isAvailable: false }
        },
        bio: 'Master trainer with 12 years of experience in muscle building and nutrition. Former bodybuilding champion. Focuses on scientific training methods and proper nutrition.',
        isActive: true
      }
    ];

    // Insert sample trainers
    await Trainer.insertMany(sampleTrainers);
    console.log('✅ Sample trainers created successfully!');
    console.log(`Created ${sampleTrainers.length} trainers`);

  } catch (error) {
    console.error('Error creating sample trainers:', error);
  }
};

const init = async () => {
  await connectDB();
  await createSampleTrainers();
  process.exit(0);
};

init();