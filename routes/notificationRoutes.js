const express = require('express');
const router = express.Router();
const { 
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  sendEmailNotification,
  getUnreadCount
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/paramValidationMiddleware');

// Protected routes
router.use(protect);

router.route('/')
  .get(getUserNotifications);

router.route('/unread-count')
  .get(getUnreadCount);

router.route('/mark-all-read')
  .put(markAllNotificationsAsRead);

router.route('/send-email')
  .post(authorize('admin', 'owner'), sendEmailNotification);

// Add explicit route for marking as read with /read suffix
router.route('/:id/read')
  .put(markNotificationAsRead);

router.route('/:id')
  .all(validateObjectId)
  .get(getNotificationById)
  .delete(deleteNotification);

module.exports = router;