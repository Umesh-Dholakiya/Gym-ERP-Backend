const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Member routes
router.route('/')
  .get(protect, authorize('admin', 'owner'), memberController.getAllMembers)
  .post(protect, authorize('admin', 'owner'), memberController.createMember);

router.route('/stats')
  .get(protect, authorize('admin', 'owner'), memberController.getMemberStats);

router.route('/:id')
  .get(protect, authorize('admin', 'owner'), memberController.getMemberById)
  .put(protect, authorize('admin', 'owner'), memberController.updateMember)
  .delete(protect, authorize('admin', 'owner'), memberController.deleteMember);

module.exports = router;