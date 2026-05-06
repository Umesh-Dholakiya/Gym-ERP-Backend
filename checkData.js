const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Check trainers
    const Trainer = require('./models/Trainer');
    const trainers = await Trainer.find({});
    console.log('\n=== TRAINERS ===');
    console.log(`Total trainers: ${trainers.length}`);
    trainers.forEach(t => {
      console.log(`${t.firstName} ${t.lastName} - ${t.email} - Active: ${t.isActive}`);
    });
    
    // Check members
    const Member = require('./models/Member');
    const members = await Member.find({});
    console.log('\n=== MEMBERS ===');
    console.log(`Total members: ${members.length}`);
    members.forEach(m => {
      console.log(`${m.firstName} ${m.lastName} - ${m.email} - Status: ${m.membership?.status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

connectDB();