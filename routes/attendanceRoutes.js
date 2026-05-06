const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Attendance routes
router.route('/checkin')
  .post(protect, authorize('admin', 'owner'), attendanceController.checkInMember);

router.route('/checkout')
  .post(protect, authorize('admin', 'owner'), attendanceController.checkOutMember);

router.route('/')
  .get(protect, authorize('admin', 'owner'), attendanceController.getAttendanceRecords);

router.route('/member/:memberId')
  .get(protect, authorize('admin', 'owner'), attendanceController.getMemberAttendanceHistory);

router.route('/stats/daily')
  .get(protect, authorize('admin', 'owner'), attendanceController.getDailyStats);

router.route('/stats/monthly')
  .get(protect, authorize('admin', 'owner'), attendanceController.getMonthlyReport);

module.exports = router;