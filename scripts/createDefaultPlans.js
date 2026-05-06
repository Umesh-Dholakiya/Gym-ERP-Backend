const mongoose = require('mongoose');
const MembershipPlan = require('../models/MembershipPlan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection
const connectDB = require('../config/db');

const createDefaultPlans = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    const defaultPlans = MembershipPlan.getDefaultPlans();
    let createdCount = 0;

    for (const planData of defaultPlans) {
      // Check if plan already exists
      const existingPlan = await MembershipPlan.findOne({ 
        name: planData.name 
      });
      
      if (!existingPlan) {
        const plan = new MembershipPlan(planData);
        await plan.save();
        console.log(`✓ Created plan: ${plan.name}`);
        createdCount++;
      } else {
        console.log(`- Plan already exists: ${planData.name}`);
      }
    }

    console.log(`\n✅ Successfully created ${createdCount} default membership plans`);
    
    // Display all plans
    const allPlans = await MembershipPlan.find({ isActive: true });
    console.log('\n📋 Current Membership Plans:');
    allPlans.forEach(plan => {
      console.log(`  • ${plan.name} - ₹${plan.price}/${plan.duration.value} ${plan.duration.unit}${plan.duration.value > 1 ? 's' : ''}`);
    });

  } catch (error) {
    console.error('Error creating default plans:', error);
  } finally {
    process.exit(0);
  }
};

createDefaultPlans();