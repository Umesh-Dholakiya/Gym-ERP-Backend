const express = require('express');
const router = express.Router();
const membershipPlanController = require('../controllers/membershipPlanController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Routes - Public for GET, Protected for POST/PUT/DELETE
router.route('/')
  .get(membershipPlanController.getAllPlans)
  .post(protect, authorize('admin', 'owner'), membershipPlanController.createPlan);

router.route('/stats')
  .get(protect, authorize('admin', 'owner'), membershipPlanController.getPlanStats);

router.route('/default')
  .post(protect, authorize('admin', 'owner'), membershipPlanController.createDefaultPlans);

router.route('/:id')
  .get(membershipPlanController.getPlanById)
  .put(protect, authorize('admin', 'owner'), membershipPlanController.updatePlan)
  .delete(protect, authorize('admin', 'owner'), membershipPlanController.deletePlan);

module.exports = router;