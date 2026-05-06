const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const { body, validationResult } = require('express-validator');

// Validation rules
const attendanceValidationRules = [
  body('memberId').notEmpty().withMessage('Member ID is required'),
  body('checkInTime').optional().isISO8601().toDate().withMessage('Valid check-in time required')
];

// @desc    Check-in member
// @route   POST /api/attendance/checkin
// @access  Private/Admin
exports.checkInMember = [
  ...attendanceValidationRules,
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

      const { memberId, checkInTime = new Date(), checkInMethod = 'manual', notes } = req.body;

      // Verify member exists and has active membership
      const member = await Member.findById(memberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      if (!member.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Member account is inactive'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if member already checked in today
      const existingCheckIn = await Attendance.findOne({
        member: memberId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        checkOutTime: null
      });

      if (existingCheckIn) {
        return res.status(400).json({
          success: false,
          message: 'Member already checked in today'
        });
      }

      // Check membership validity
      if (member.membership.endDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Membership has expired'
        });
      }

      const attendance = new Attendance({
        member: memberId,
        date: new Date(),
        checkInTime: new Date(checkInTime),
        checkInMethod,
        notes
      });

      await attendance.save();
      
      // Populate member info
      await attendance.populate('member', 'firstName lastName email');

      res.status(201).json({
        success: true,
        message: 'Member checked in successfully',
        data: attendance
      });
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during check-in'
      });
    }
  }
];

// @desc    Check-out member
// @route   POST /api/attendance/checkout
// @access  Private/Admin
exports.checkOutMember = [
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

      const { memberId, checkOutTime = new Date(), checkOutMethod = 'manual', notes } = req.body;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find today's check-in record
      const attendance = await Attendance.findOne({
        member: memberId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        checkOutTime: null
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'No active check-in found for today'
        });
      }

      // Update checkout details
      attendance.checkOutTime = new Date(checkOutTime);
      attendance.checkOutMethod = checkOutMethod;
      
      if (notes) {
        attendance.notes = attendance.notes ? `${attendance.notes}\n${notes}` : notes;
      }

      await attendance.save();
      await attendance.populate('member', 'firstName lastName email');

      res.json({
        success: true,
        message: 'Member checked out successfully',
        data: {
          attendance,
          sessionDuration: attendance.sessionDuration
        }
      });
    } catch (error) {
      console.error('Check-out error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during check-out'
      });
    }
  }
];

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private/Admin
exports.getAttendanceRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const memberId = req.query.memberId;

    // Set date range for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let query = {
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };

    if (memberId) {
      query.member = memberId;
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('member', 'firstName lastName email phone')
      .sort({ checkInTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: attendanceRecords,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance records'
    });
  }
};

// @desc    Get member attendance history
// @route   GET /api/attendance/member/:memberId
// @access  Private/Admin
exports.getMemberAttendanceHistory = async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;

    // Verify member exists
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const attendanceHistory = await Attendance.find({ member: memberId })
      .populate('member', 'firstName lastName')
      .sort({ date: -1, checkInTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments({ member: memberId });

    // Calculate statistics
    const stats = await Attendance.aggregate([
      {
        $match: { member: member._id }
      },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          averageDuration: { $avg: '$sessionDuration' },
          totalDuration: { $sum: '$sessionDuration' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        member: {
          id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email
        },
        attendanceHistory,
        statistics: stats[0] || {
          totalVisits: 0,
          averageDuration: 0,
          totalDuration: 0
        }
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Get member attendance history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance history'
    });
  }
};

// @desc    Get daily attendance statistics
// @route   GET /api/attendance/stats/daily
// @access  Private/Admin
exports.getDailyStats = async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    
    const stats = await Attendance.getDailyStats(date);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching daily statistics'
    });
  }
};

// @desc    Get monthly attendance report
// @route   GET /api/attendance/stats/monthly
// @access  Private/Admin
exports.getMonthlyReport = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const report = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          checkIns: { $sum: 1 },
          averageDuration: { $avg: '$sessionDuration' },
          uniqueMembers: { $addToSet: '$member' }
        }
      },
      {
        $project: {
          date: '$_id',
          checkIns: 1,
          averageDuration: { $round: ['$averageDuration', 2] },
          uniqueMembers: { $size: '$uniqueMembers' }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Overall monthly stats
    const overallStats = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalCheckIns: { $sum: 1 },
          averageDailyCheckIns: { $avg: 1 },
          averageSessionDuration: { $avg: '$sessionDuration' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        monthlyReport: report,
        overallStats: overallStats[0] || {
          totalCheckIns: 0,
          averageDailyCheckIns: 0,
          averageSessionDuration: 0
        },
        period: {
          year,
          month,
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching monthly report'
    });
  }
};