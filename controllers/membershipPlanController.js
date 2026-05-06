const MembershipPlan = require('../models/MembershipPlan');
const Member = require('../models/Member');
const { body, validationResult } = require('express-validator');

// Validation rules
const planValidationRules = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Plan name must be 3-100 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('duration.value').isInt({ min: 1 }).withMessage('Duration value must be positive'),
  body('duration.unit').isIn(['day', 'week', 'month', 'year']).withMessage('Invalid duration unit'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be non-negative')
];

// @desc    Get all membership plans
// @route   GET /api/plans
// @access  Public
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find({ isActive: true })
      .sort({ price: 1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching plans'
    });
  }
};

// @desc    Get plan by ID
// @route   GET /api/plans/:id
// @access  Public
exports.getPlanById = async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching plan'
    });
  }
};

// @desc    Create new membership plan
// @route   POST /api/plans
// @access  Private/Admin
exports.createPlan = [
  ...planValidationRules,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { name, description, duration, price, features, benefits, limitations } = req.body;

      // Check if plan with same name exists
      const existingPlan = await MembershipPlan.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
      });
      
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: 'Plan with this name already exists'
        });
      }

      const plan = new MembershipPlan({
        name,
        description,
        duration,
        price,
        features: features || [],
        benefits: benefits || [],
        limitations: limitations || []
      });

      await plan.save();

      res.status(201).json({
        success: true,
        message: 'Membership plan created successfully',
        data: plan
      });
    } catch (error) {
      console.error('Create plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating plan'
      });
    }
  }
];

// @desc    Update membership plan
// @route   PUT /api/plans/:id
// @access  Private/Admin
exports.updatePlan = async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    const updates = req.body;
    delete updates.createdAt; // Prevent updating creation date
    
    Object.keys(updates).forEach(key => {
      plan[key] = updates[key];
    });

    await plan.save();

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plan
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating plan'
    });
  }
};

// @desc    Delete membership plan
// @route   DELETE /api/plans/:id
// @access  Private/Admin
exports.deletePlan = async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Check if any members are using this plan
    const membersWithPlan = await Member.countDocuments({ 
      'membership.plan': plan._id,
      'membership.status': 'active' 
    });

    if (membersWithPlan > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. ${membersWithPlan} active members are using this plan.`
      });
    }

    // Soft delete by setting inactive
    plan.isActive = false;
    await plan.save();

    res.json({
      success: true,
      message: 'Plan deactivated successfully'
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting plan'
    });
  }
};

// @desc    Get plan statistics
// @route   GET /api/plans/stats
// @access  Private/Admin
exports.getPlanStats = async (req, res) => {
  try {
    const totalPlans = await MembershipPlan.countDocuments({ isActive: true });
    
    // Get member distribution by plan
    const planStats = await Member.aggregate([
      {
        $match: {
          'membership.status': 'active'
        }
      },
      {
        $lookup: {
          from: 'membershipplans',
          localField: 'membership.plan',
          foreignField: '_id',
          as: 'planDetails'
        }
      },
      {
        $unwind: '$planDetails'
      },
      {
        $group: {
          _id: '$planDetails._id',
          planName: { $first: '$planDetails.name' },
          memberCount: { $sum: 1 },
          totalRevenue: { $sum: '$planDetails.price' }
        }
      },
      {
        $sort: { memberCount: -1 }
      }
    ]);

    // Revenue projections
    const monthlyRevenue = planStats.reduce((total, plan) => {
      return total + (plan.totalRevenue * plan.memberCount);
    }, 0);

    res.json({
      success: true,
      data: {
        totalPlans,
        planDistribution: planStats,
        monthlyRevenueProjection: monthlyRevenue
      }
    });
  } catch (error) {
    console.error('Get plan stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching plan statistics'
    });
  }
};

// @desc    Create default plans
// @route   POST /api/plans/default
// @access  Private/Admin
exports.createDefaultPlans = async (req, res) => {
  try {
    const defaultPlans = MembershipPlan.getDefaultPlans();
    const createdPlans = [];

    for (const planData of defaultPlans) {
      // Check if plan already exists
      const existingPlan = await MembershipPlan.findOne({ 
        name: planData.name 
      });
      
      if (!existingPlan) {
        const plan = new MembershipPlan(planData);
        await plan.save();
        createdPlans.push(plan);
      }
    }

    res.json({
      success: true,
      message: `${createdPlans.length} default plans created successfully`,
      data: createdPlans
    });
  } catch (error) {
    console.error('Create default plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating default plans'
    });
  }
};