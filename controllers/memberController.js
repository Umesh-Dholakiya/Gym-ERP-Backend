const Member = require('../models/Member');
const MembershipPlan = require('../models/MembershipPlan');
const Attendance = require('../models/Attendance');
const { body, validationResult } = require('express-validator');
const QRCode = require('qrcode');

// Validation rules
const memberValidationRules = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number required'),
  body('dateOfBirth').isISO8601().toDate().withMessage('Valid date of birth required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender required'),
  body('membership.plan').notEmpty().withMessage('Membership plan is required')
];

// Generate unique QR code for member
const generateQRCode = async (memberId) => {
  try {
    const qrData = JSON.stringify({
      memberId: memberId,
      timestamp: Date.now()
    });
    const qrCode = await QRCode.toDataURL(qrData);
    return qrCode;
  } catch (error) {
    console.error('QR Code generation failed:', error);
    return null;
  }
};

// @desc    Get all members
// @route   GET /api/members
// @access  Private/Admin
exports.getAllMembers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    
    // Build search query
    let query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query['membership.status'] = status;
    }

    const members = await Member.find(query)
      .populate('membership.plan')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Member.countDocuments(query);

    res.json({
      success: true,
      data: members,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMembers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching members'
    });
  }
};

// @desc    Get member by ID
// @route   GET /api/members/:id
// @access  Private/Admin
exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate('membership.plan');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Get attendance history
    const attendanceHistory = await Attendance.find({ member: member._id })
      .sort({ date: -1, checkInTime: -1 })
      .limit(30);

    res.json({
      success: true,
      data: {
        member,
        attendanceHistory
      }
    });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching member'
    });
  }
};

// @desc    Create new member
// @route   POST /api/members
// @access  Private/Admin
exports.createMember = [
  ...memberValidationRules,
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

      const {
        firstName, lastName, email, phone, dateOfBirth, gender,
        address, emergencyContact, fitnessGoals, medicalHistory,
        membership
      } = req.body;

      // Check if member already exists
      const existingMember = await Member.findOne({ 
        $or: [{ email }, { phone }] 
      });
      
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'Member with this email or phone already exists'
        });
      }

      // Validate membership plan
      const plan = await MembershipPlan.findById(membership.plan);
      if (!plan) {
        return res.status(400).json({
          success: false,
          message: 'Invalid membership plan'
        });
      }

      // Calculate membership dates
      const startDate = new Date(membership.startDate || Date.now());
      let endDate = new Date(startDate);
      
      if (plan.duration.unit === 'day') {
        endDate.setDate(endDate.getDate() + plan.duration.value);
      } else if (plan.duration.unit === 'week') {
        endDate.setDate(endDate.getDate() + (plan.duration.value * 7));
      } else if (plan.duration.unit === 'month') {
        endDate.setMonth(endDate.getMonth() + plan.duration.value);
      } else if (plan.duration.unit === 'year') {
        endDate.setFullYear(endDate.getFullYear() + plan.duration.value);
      }

      // Create member
      const member = new Member({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        gender,
        address: address || {},
        emergencyContact: emergencyContact || {},
        fitnessGoals: fitnessGoals || [],
        medicalHistory: medicalHistory || {},
        membership: {
          plan: plan._id,
          startDate,
          endDate,
          status: 'active',
          paymentStatus: membership.paymentStatus || 'pending'
        }
      });

      // Generate QR code
      const qrCode = await generateQRCode(member._id);
      if (qrCode) {
        member.qrCode = qrCode;
      }

      await member.save();
      
      // Populate the plan reference
      await member.populate('membership.plan');

      res.status(201).json({
        success: true,
        message: 'Member created successfully',
        data: member
      });
    } catch (error) {
      console.error('Create member error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating member'
      });
    }
  }
];

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private/Admin
exports.updateMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const updates = req.body;
    
    // Prevent updating certain fields
    delete updates.qrCode;
    delete updates.createdAt;
    
    Object.keys(updates).forEach(key => {
      member[key] = updates[key];
    });

    await member.save();
    await member.populate('membership.plan');

    res.json({
      success: true,
      message: 'Member updated successfully',
      data: member
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating member'
    });
  }
};

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private/Admin
exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    await Member.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting member'
    });
  }
};

// @desc    Get membership statistics
// @route   GET /api/members/stats
// @access  Private/Admin
exports.getMemberStats = async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ 'membership.status': 'active' });
    const expiredMembers = await Member.countDocuments({ 'membership.status': 'expired' });
    const pendingPayments = await Member.countDocuments({ 'membership.paymentStatus': 'pending' });
    const overduePayments = await Member.countDocuments({ 'membership.paymentStatus': 'overdue' });

    // Membership plan distribution
    const planDistribution = await Member.aggregate([
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
          _id: '$planDetails.name',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        expiredMembers,
        pendingPayments,
        overduePayments,
        planDistribution
      }
    });
  } catch (error) {
    console.error('Get member stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};