const express = require('express');
const router = express.Router();
const classScheduleController = require('../controllers/classScheduleController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Class schedule routes
router.route('/')
  .get(protect, authorize('admin', 'owner'), classScheduleController.getAllClasses)
  .post(protect, authorize('admin', 'owner'), classScheduleController.createClass);

router.route('/stats')
  .get(protect, authorize('admin', 'owner'), classScheduleController.getClassStats);

router.route('/:id')
  .get(protect, authorize('admin', 'owner'), classScheduleController.getClassById)
  .put(protect, authorize('admin', 'owner'), classScheduleController.updateClass)
  .delete(protect, authorize('admin', 'owner'), classScheduleController.deleteClass);

router.route('/:id/enroll')
  .post(protect, authorize('admin', 'owner'), classScheduleController.enrollMember);

module.exports = router;