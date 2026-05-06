const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Notification = require('../models/Notification');
const User = require('../models/User');

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

const createSampleNotifications = async () => {
  try {
    // Clear existing notifications
    await Notification.deleteMany({});
    console.log('Cleared existing notifications');

    // Get admin users
    const admins = await User.find({ role: { $in: ['admin', 'owner'] } });
    
    if (admins.length === 0) {
      console.log('No admin users found. Please create an admin user first.');
      return;
    }

    // Create sample notifications with valid types
    const sampleNotifications = [
      {
        userId: admins[0]._id,
        type: 'new-inquiry',
        title: 'New Inquiry Received',
        message: 'John Doe submitted an inquiry about Personal Training',
        sentVia: { email: true, inApp: true }
      },
      {
        userId: admins[0]._id,
        type: 'follow-up-due',
        title: 'Follow-up Reminder',
        message: 'Follow-up with Jane Smith regarding Weight Loss Program',
        sentVia: { email: false, inApp: true }
      },
      {
        userId: admins[0]._id,
        type: 'inquiry-converted',
        title: 'Inquiry Converted',
        message: 'Mike Johnson has converted from inquiry to member',
        sentVia: { email: true, inApp: true }
      },
      {
        userId: admins[0]._id,
        type: 'system-alert',
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight at 2 AM',
        sentVia: { email: false, inApp: true }
      },
      {
        userId: admins[0]._id,
        type: 'new-inquiry',
        title: 'New Inquiry Received',
        message: 'Sarah Wilson submitted an inquiry about Yoga Classes',
        sentVia: { email: true, inApp: true }
      }
    ];

    // Insert sample notifications
    await Notification.insertMany(sampleNotifications);
    console.log('✅ Sample notifications created successfully!');
    console.log(`Created ${sampleNotifications.length} notifications`);

  } catch (error) {
    console.error('Error creating sample notifications:', error);
  }
};

const init = async () => {
  await connectDB();
  await createSampleNotifications();
  process.exit(0);
};

init();