const ClassSchedule = require('../models/ClassSchedule');
const Trainer = require('../models/Trainer');
const Member = require('../models/Member');
const { body, validationResult } = require('express-validator');

// Validation rules
const classValidationRules = [
  body('className').trim().isLength({ min: 3, max: 100 }).withMessage('Class name must be 3-100 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('trainer').notEmpty().withMessage('Trainer is required'),
  body('category').isIn([
    'strength', 'cardio', 'yoga', 'pilates', 'crossfit',
    'hiit', 'zumba', 'boxing', 'cycling', 'stretching',
    'personal-training', 'group-training', 'kids-class'
  ]).withMessage('Invalid category'),
  body('schedule.dayOfWeek').isIn([
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ]).withMessage('Invalid day of week'),
  body('schedule.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
  body('schedule.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format'),
  body('capacity').isInt({ min: 1, max: 100 }).withMessage('Capacity must be 1-100'),
  body('fee').isFloat({ min: 0 }).withMessage('Fee must be non-negative')
];

// @desc    Get all class schedules
// @route   GET /api/classes
// @access  Private/Admin
exports.getAllClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const day = req.query.day || '';
    const category = req.query.category || '';
    const trainerId = req.query.trainer || '';

    let query = { isActive: true };
    
    if (day) query['schedule.dayOfWeek'] = day;
    if (category) query.category = category;
    if (trainerId) query.trainer = trainerId;

    const classes = await ClassSchedule.find(query)
      .populate('trainer', 'firstName lastName specialization')
      .sort({ 'schedule.dayOfWeek': 1, 'schedule.startTime': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ClassSchedule.countDocuments(query);

    res.json({
      success: true,
      data: classes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalClasses: total
      }
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching classes'
    });
  }
};

// @desc    Get class by ID
// @route   GET /api/classes/:id
// @access  Private/Admin
exports.getClassById = async (req, res) => {
  try {
    const classSchedule = await ClassSchedule.findById(req.params.id)
      .populate('trainer', 'firstName lastName email phone specialization bio')
      .populate('enrolledMembers.member', 'firstName lastName email phone');

    if (!classSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.json({
      success: true,
      data: classSchedule
    });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class'
    });
  }
};

// @desc    Create new class schedule
// @route   POST /api/classes
// @access  Private/Admin
exports.createClass = [
  ...classValidationRules,
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
        className, description, trainer, category, difficulty,
        schedule, capacity, fee, room, equipmentRequired
      } = req.body;

      // Verify trainer exists and is active
      const trainerDoc = await Trainer.findById(trainer);
      if (!trainerDoc || !trainerDoc.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive trainer'
        });
      }

      // Check for scheduling conflicts
      const conflictingClass = await ClassSchedule.findOne({
        trainer: trainer,
        'schedule.dayOfWeek': schedule.dayOfWeek,
        isActive: true,
        $or: [
          {
            'schedule.startTime': { $lt: schedule.endTime },
            'schedule.endTime': { $gt: schedule.startTime }
          }
        ]
      });

      if (conflictingClass) {
        return res.status(400).json({
          success: false,
          message: 'Trainer has a conflicting class schedule'
        });
      }

      const classSchedule = new ClassSchedule({
        className,
        description,
        trainer,
        category,
        difficulty: difficulty || 'beginner',
        schedule,
        capacity,
        fee,
        room: room || '',
        equipmentRequired: equipmentRequired || []
      });

      await classSchedule.save();
      await classSchedule.populate('trainer', 'firstName lastName');

      res.status(201).json({
        success: true,
        message: 'Class schedule created successfully',
        data: classSchedule
      });
    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating class'
      });
    }
  }
];

// @desc    Update class schedule
// @route   PUT /api/classes/:id
// @access  Private/Admin
exports.updateClass = async (req, res) => {
  try {
    const classSchedule = await ClassSchedule.findById(req.params.id);
    if (!classSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const updates = req.body;
    delete updates.createdAt;
    
    Object.keys(updates).forEach(key => {
      classSchedule[key] = updates[key];
    });

    await classSchedule.save();
    await classSchedule.populate('trainer', 'firstName lastName');

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: classSchedule
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating class'
    });
  }
};

// @desc    Delete class schedule
// @route   DELETE /api/classes/:id
// @access  Private/Admin
exports.deleteClass = async (req, res) => {
  try {
    const classSchedule = await ClassSchedule.findById(req.params.id);
    if (!classSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    classSchedule.isActive = false;
    await classSchedule.save();

    res.json({
      success: true,
      message: 'Class deactivated successfully'
    });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting class'
    });
  }
};

// @desc    Enroll member in class
// @route   POST /api/classes/:id/enroll
// @access  Private/Admin
exports.enrollMember = [
  body('memberId').notEmpty().withMessage('Member ID is required'),
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

      const { memberId } = req.body;
      const classId = req.params.id;

      const classSchedule = await ClassSchedule.findById(classId);
      if (!classSchedule) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      if (!classSchedule.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Class is not active'
        });
      }

      // Check if member exists and has active membership
      const member = await Member.findById(memberId);
      if (!member || !member.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive member'
        });
      }

      if (member.membership.endDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Member membership has expired'
        });
      }

      // Check if already enrolled
      const existingEnrollment = classSchedule.enrolledMembers.find(
        enrollment => enrollment.member.toString() === memberId
      );

      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: 'Member already enrolled in this class'
        });
      }

      // Check capacity
      if (classSchedule.currentEnrollment >= classSchedule.capacity) {
        return res.status(400).json({
          success: false,
          message: 'Class is at full capacity'
        });
      }

      // Add enrollment
      classSchedule.enrolledMembers.push({
        member: memberId,
        enrollmentDate: new Date(),
        status: 'confirmed'
      });

      await classSchedule.save();
      await classSchedule.populate('enrolledMembers.member', 'firstName lastName email');

      res.json({
        success: true,
        message: 'Member enrolled successfully',
        data: classSchedule
      });
    } catch (error) {
      console.error('Enroll member error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while enrolling member'
      });
    }
  }
];

// @desc    Get class statistics
// @route   GET /api/classes/stats
// @access  Private/Admin
exports.getClassStats = async (req, res) => {
  try {
    const totalClasses = await ClassSchedule.countDocuments({ isActive: true });
    
    const categoryStats = await ClassSchedule.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averageCapacity: { $avg: '$capacity' },
          totalEnrollments: { $sum: { $size: '$enrolledMembers' } }
        }
      }
    ]);

    const dayStats = await ClassSchedule.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$schedule.dayOfWeek',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalClasses,
        categoryDistribution: categoryStats,
        dayDistribution: dayStats
      }
    });
  } catch (error) {
    console.error('Get class stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class statistics'
    });
  }
};