const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'dholakiyaumesh45@gmail.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('To reset password, delete this user and run this script again.');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Umesh Dholakiya',
      email: 'dholakiyaumesh45@gmail.com',
      password: 'dholakiyaumesh@45', // Default password - change this after first login
      role: 'admin',
      isActive: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: dholakiyaumesh45@gmail.com');
    console.log('🔑 Password: dholakiyaumesh@45');
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();