const express = require('express');
const router = express.Router();
const { 
  getServices, 
  getActiveServices, 
  getServiceById, 
  createService, 
  updateService, 
  deleteService,
  getServiceStats
} = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const { validateObjectId } = require('../middleware/paramValidationMiddleware');

// Public routes
router.get('/', getServices);
router.get('/active', getActiveServices);
router.get('/:id', validateObjectId, getServiceById);

// Protected routes for admin operations
router.use(protect);
router.use(authorize('admin', 'owner'));

router.route('/')
  .post(validate(schemas.serviceCreate), createService)
  .get(getServices);

router.route('/stats')
  .get(getServiceStats);

router.route('/:id')
  .all(validateObjectId)
  .get(getServiceById)
  .put(validate(schemas.serviceUpdate), updateService)
  .delete(deleteService);

module.exports = router;