const Trainer = require('../models/Trainer');
const ClassSchedule = require('../models/ClassSchedule');
const { body, validationResult } = require('express-validator');
const upload = require('../middleware/uploadMiddleware');

// Validation rules
const trainerValidationRules = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number required'),
  body('dateOfBirth').isISO8601().toDate().withMessage('Valid date of birth required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender required'),
  body('hourlyRate').isFloat({ min: 0 }).withMessage('Hourly rate must be non-negative'),
  body('specialization').isArray({ min: 1 }).withMessage('At least one specialization required')
];

// @desc    Get all trainers
// @route   GET /api/trainers
// @access  Private/Admin
exports.getAllTrainers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const specialization = req.query.specialization || '';
    
    // Build search query
    let query = { isActive: true };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (specialization) {
      query.specialization = specialization;
    }

    const trainers = await Trainer.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Trainer.countDocuments(query);

    res.json({
      success: true,
      data: trainers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTrainers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get trainers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainers'
    });
  }
};

// @desc    Get trainer by ID
// @route   GET /api/trainers/:id
// @access  Private/Admin
exports.getTrainerById = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Get trainer's classes
    const classes = await ClassSchedule.find({ 
      trainer: trainer._id, 
      isActive: true 
    }).populate('enrolledMembers.member', 'firstName lastName email');

    res.json({
      success: true,
      data: {
        trainer,
        classes
      }
    });
  } catch (error) {
    console.error('Get trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainer'
    });
  }
};

// @desc    Create new trainer
// @route   POST /api/trainers
// @access  Private/Admin
exports.createTrainer = [
  ...trainerValidationRules,
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
        specialization, certifications, experience, availability,
        hourlyRate, commissionRate, bio, photo
      } = req.body;

      // Check if trainer already exists
      const existingTrainer = await Trainer.findOne({ 
        $or: [{ email }, { phone }] 
      });
      
      if (existingTrainer) {
        return res.status(400).json({
          success: false,
          message: 'Trainer with this email or phone already exists'
        });
      }

      const trainer = new Trainer({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        gender,
        specialization: specialization || [],
        certifications: certifications || [],
        experience: experience || { years: 0, previousGyms: [] },
        availability: availability || {},
        hourlyRate,
        commissionRate: commissionRate || 10,
        bio: bio || '',
        photo: photo || null
      });

      await trainer.save();

      res.status(201).json({
        success: true,
        message: 'Trainer created successfully',
        data: trainer
      });
    } catch (error) {
      console.error('Create trainer error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating trainer'
      });
    }
  }
];

// @desc    Update trainer
// @route   PUT /api/trainers/:id
// @access  Private/Admin
exports.updateTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    const updates = req.body;
    delete updates.createdAt;
    delete updates.joinDate;
    
    Object.keys(updates).forEach(key => {
      trainer[key] = updates[key];
    });

    await trainer.save();

    res.json({
      success: true,
      message: 'Trainer updated successfully',
      data: trainer
    });
  } catch (error) {
    console.error('Update trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating trainer'
    });
  }
};

// @desc    Deactivate trainer
// @route   DELETE /api/trainers/:id
// @access  Private/Admin
exports.deactivateTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    trainer.isActive = false;
    await trainer.save();

    // Deactivate all classes for this trainer
    await ClassSchedule.updateMany(
      { trainer: trainer._id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Trainer deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deactivating trainer'
    });
  }
};

// @desc    Get trainer availability
// @route   GET /api/trainers/:id/availability
// @access  Private/Admin
exports.getTrainerAvailability = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    res.json({
      success: true,
      data: trainer.availability
    });
  } catch (error) {
    console.error('Get trainer availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainer availability'
    });
  }
};

// @desc    Get all active trainers for public website
// @route   GET /api/trainers/public
// @access  Public
exports.getPublicTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.find({ isActive: true })
      .select('firstName lastName email phone specialization experience photo bio')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: trainers,
      count: trainers.length
    });
  } catch (error) {
    console.error('Get public trainers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainers'
    });
  }
};

// @desc    Get trainer statistics
// @route   GET /api/trainers/stats
// @access  Private/Admin
exports.getTrainerStats = async (req, res) => {
  try {
    const totalTrainers = await Trainer.countDocuments({ isActive: true });
    const specializationStats = await Trainer.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$specialization' },
      {
        $group: {
          _id: '$specialization',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const avgExperience = await Trainer.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          averageYears: { $avg: '$experience.years' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalTrainers,
        specializationDistribution: specializationStats,
        averageExperience: avgExperience[0]?.averageYears || 0
      }
    });
  } catch (error) {
    console.error('Get trainer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainer statistics'
    });
  }
};