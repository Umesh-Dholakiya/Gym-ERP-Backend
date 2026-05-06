const express = require('express');
const router = express.Router();
const { 
  createInquiry, 
  getInquiries, 
  getInquiryById, 
  updateInquiry, 
  deleteInquiry, 
  getInquiryStats,
  getPendingFollowUps
} = require('../controllers/inquiryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const { validateObjectId } = require('../middleware/paramValidationMiddleware');

// Public route for creating inquiries
router.post('/', validate(schemas.inquiryCreate), createInquiry);

// Protected routes for admin operations
router.use(protect);
router.use(authorize('admin', 'owner'));

router.route('/')
  .get(getInquiries);

router.route('/stats')
  .get(getInquiryStats);

router.route('/pending-followups')
  .get(getPendingFollowUps);

router.route('/:id')
  .all(validateObjectId)
  .get(getInquiryById)
  .put(validate(schemas.inquiryUpdate), updateInquiry)
  .delete(deleteInquiry);

module.exports = router;