const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');
const upload = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route for website trainers
router.route('/public')
  .get(trainerController.getPublicTrainers);

// Trainer routes
router.route('/')
  .get(protect, authorize('admin', 'owner'), trainerController.getAllTrainers)
  .post(
    protect, 
    authorize('admin', 'owner'), 
    upload.single('photo'),
    (req, res, next) => {
      // Parse JSON data from form field
      if (req.body.data) {
        try {
          const jsonData = JSON.parse(req.body.data);
          Object.assign(req.body, jsonData);
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: 'Invalid JSON data'
          });
        }
      }
      // Add photo path to request body if file was uploaded
      if (req.file) {
        req.body.photo = `/uploads/${req.file.filename}`;
      }
      next();
    },
    trainerController.createTrainer
  );

router.route('/stats')
  .get(protect, authorize('admin', 'owner'), trainerController.getTrainerStats);

router.route('/:id')
  .get(protect, authorize('admin', 'owner'), trainerController.getTrainerById)
  .put(
    protect, 
    authorize('admin', 'owner'), 
    upload.single('photo'),
    (req, res, next) => {
      // Parse JSON data from form field
      if (req.body.data) {
        try {
          const jsonData = JSON.parse(req.body.data);
          Object.assign(req.body, jsonData);
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: 'Invalid JSON data'
          });
        }
      }
      // Add photo path to request body if file was uploaded
      if (req.file) {
        req.body.photo = `/uploads/${req.file.filename}`;
      }
      next();
    },
    trainerController.updateTrainer
  )
  .delete(protect, authorize('admin', 'owner'), trainerController.deactivateTrainer);

router.route('/:id/availability')
  .get(protect, authorize('admin', 'owner'), trainerController.getTrainerAvailability);

module.exports = router;