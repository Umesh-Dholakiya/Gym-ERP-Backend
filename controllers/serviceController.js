const Service = require('../models/Service');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
  try {
    const { category, isActive = true, sortBy = 'sortOrder', sortOrder = 'asc' } = req.query;

    // Build filter object
    let filter = { isActive: isActive === 'false' ? false : true };

    if (category) {
      filter.category = category;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    const services = await Service.find(filter)
      .sort(sort);

    res.status(200).json({
      status: 'success',
      data: {
        services
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch services'
    });
  }
};

// @desc    Get active services only
// @route   GET /api/services/active
// @access  Public
const getActiveServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        services
      }
    });

  } catch (error) {
    console.error('Get active services error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch active services'
    });
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        service
      }
    });

  } catch (error) {
    console.error('Get service by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid service ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service'
    });
  }
};

// @desc    Create new service
// @route   POST /api/services
// @access  Private/Admin
const createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Service created successfully',
      data: {
        service
      }
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create service'
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private/Admin
const updateService = async (req, res) => {
  try {
    const allowedUpdates = [
      'name', 'description', 'price', 'duration', 'features', 
      'category', 'isActive', 'sortOrder', 'imageUrl', 'benefits', 'terms'
    ];
    const updates = Object.keys(req.body);

    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    if (!isValidOperation) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid update fields'
      });
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Service updated successfully',
      data: {
        service
      }
    });

  } catch (error) {
    console.error('Update service error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid service ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to update service'
    });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private/Admin
const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid service ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete service'
    });
  }
};

// @desc    Get service statistics
// @route   GET /api/services/stats
// @access  Private/Admin
const getServiceStats = async (req, res) => {
  try {
    const totalServices = await Service.countDocuments();
    const activeServices = await Service.countDocuments({ isActive: true });
    const inactiveServices = await Service.countDocuments({ isActive: false });

    const categoryStats = await Service.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          total: totalServices,
          active: activeServices,
          inactive: inactiveServices,
          byCategory: categoryStats
        }
      }
    });

  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service statistics'
    });
  }
};

module.exports = {
  getServices,
  getActiveServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceStats
};