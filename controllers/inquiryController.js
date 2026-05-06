const Inquiry = require('../models/Inquiry');
const Service = require('../models/Service');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendNewInquiryEmail, sendNewInquiryWhatsApp } = require('../controllers/notificationController');
const { sendEmail } = require('../utils/email');
const { validate } = require('../middleware/validationMiddleware');

// @desc    Create new inquiry
// @route   POST /api/inquiries
// @access  Public
const createInquiry = async (req, res) => {
  try {
    const { name, phone, email, service: serviceId, message, preferredTime } = req.body;

    // Validate service exists
    let service;
    try {
      service = await Service.findById(serviceId);
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid service ID format'
        });
      }
      throw error; // Re-throw if it's a different error
    }
    
    if (!service || !service.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Selected service is not available'
      });
    }

    // Check if inquiry already exists (prevent duplicates)
    const existingInquiry = await Inquiry.findOne({ 
      email, 
      phone,
      service: serviceId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (existingInquiry) {
      return res.status(400).json({
        status: 'error',
        message: 'An inquiry with similar details was submitted recently'
      });
    }

    // Create inquiry
    const inquiry = await Inquiry.create({
      name,
      phone,
      email,
      service: serviceId,
      serviceName: service.name, // Populate service name directly
      message,
      preferredTime,
      source: req.query.source || 'website'
    });

    // Populate the inquiry with service name
    await inquiry.populate('service', 'name');

    // Create notification for admin about new inquiry (non-blocking)
    const createNotifications = async () => {
      try {
        const admins = await User.find({ role: { $in: ['admin', 'owner'] }, isActive: true });
        for (const admin of admins) {
          const notification = await Notification.create({
            userId: admin._id,
            type: 'new-inquiry',
            title: 'New Inquiry Received',
            message: `New inquiry from ${name} for ${inquiry.service.name}`,
            inquiryId: inquiry._id,
          });

          // Emit real-time notification if socket is available
          if (global.emitNotification) {
            global.emitNotification(admin._id.toString(), notification);
          }
        }
      } catch (err) {
        console.error('Error creating notifications:', err);
      }
    };
    
    // Execute notification creation in background
    createNotifications();

    // Send email and WhatsApp notification to admins (non-blocking)
    // Make sure to import sendNewInquiryEmail at the top of the file
    if (typeof sendNewInquiryEmail === 'function') {
      sendNewInquiryEmail(inquiry).catch(err => {
        console.error('Error sending inquiry email:', err);
      });
      
      // Send WhatsApp notification for new inquiry
      sendNewInquiryWhatsApp(inquiry).catch(err => {
        console.error('Error sending inquiry WhatsApp notification:', err);
      });
    } else {
      console.error('sendNewInquiryEmail function not available');
    }

    res.status(201).json({
      status: 'success',
      message: 'Inquiry submitted successfully',
      data: {
        inquiry
      }
    });

  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create inquiry'
    });
  }
};

// @desc    Get all inquiries
// @route   GET /api/inquiries
// @access  Private/Admin
const getInquiries = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search, 
      startDate, 
      endDate,
      sortBy = '-createdAt',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    let filter = {};

    if (status) {
      filter.status = { $in: Array.isArray(status) ? status : [status] };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    // Execute query
    const inquiries = await Inquiry.find(filter)
      .populate('service', 'name')
      .populate('assignedTo', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Inquiry.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        inquiries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          hasNext: skip + inquiries.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inquiries'
    });
  }
};

// @desc    Get single inquiry
// @route   GET /api/inquiries/:id
// @access  Private/Admin
const getInquiryById = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('service', 'name description price')
      .populate('assignedTo', 'name email')
      .populate('notifications', 'title message createdAt');

    if (!inquiry) {
      return res.status(404).json({
        status: 'error',
        message: 'Inquiry not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        inquiry
      }
    });

  } catch (error) {
    console.error('Get inquiry by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid inquiry ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inquiry'
    });
  }
};

// @desc    Update inquiry
// @route   PUT /api/inquiries/:id
// @access  Private/Admin
const updateInquiry = async (req, res) => {
  try {
    const allowedUpdates = ['status', 'notes', 'followUpDate', 'assignedTo'];
    const updates = Object.keys(req.body);

    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    if (!isValidOperation) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid update fields'
      });
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('service', 'name')
      .populate('assignedTo', 'name email');

    if (!inquiry) {
      return res.status(404).json({
        status: 'error',
        message: 'Inquiry not found'
      });
    }

    // Create notification if status changed
    if (req.body.status && req.body.status !== inquiry.status) {
      const notification = await Notification.create({
        userId: req.user._id,
        type: 'inquiry-status-changed',
        title: 'Inquiry Status Updated',
        message: `Inquiry status changed to ${req.body.status}`,
        inquiryId: inquiry._id
      });

      // Emit real-time notification if socket is available
      if (global.emitNotification) {
        global.emitNotification(req.user._id.toString(), notification);
      }

      // Send email notification for important status changes
      if (['converted', 'closed'].includes(req.body.status)) {
        // Get inquiry with populated service
        const fullInquiry = await Inquiry.findById(inquiry._id)
          .populate('service', 'name')
          .populate('assignedTo', 'name email');
        
        // Get admin who made the change
        const updatingAdmin = await User.findById(req.user._id);
        
        // Get all admins for email notification
        const admins = await User.find({ role: { $in: ['admin', 'owner'] }, isActive: true });
        
        for (const admin of admins) {
          await sendEmail({
            to: admin.email,
            subject: `Inquiry Status Changed - ${fullInquiry.name}`,
            html: `
              <h2>Inquiry Status Updated</h2>
              <p><strong>Status:</strong> ${req.body.status}</p>
              <p><strong>Name:</strong> ${fullInquiry.name}</p>
              <p><strong>Email:</strong> ${fullInquiry.email}</p>
              <p><strong>Phone:</strong> ${fullInquiry.phone}</p>
              <p><strong>Service:</strong> ${fullInquiry.service?.name || 'N/A'}</p>
              <p><strong>Updated by:</strong> ${updatingAdmin?.name || 'Unknown'}</p>
              <p><strong>Updated at:</strong> ${new Date()}</p>
              <hr>
              <p>Please check your CRM panel for more details.</p>
            `
          });
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Inquiry updated successfully',
      data: {
        inquiry
      }
    });

  } catch (error) {
    console.error('Update inquiry error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid inquiry ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to update inquiry'
    });
  }
};

// @desc    Delete inquiry
// @route   DELETE /api/inquiries/:id
// @access  Private/Admin
const deleteInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        status: 'error',
        message: 'Inquiry not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Inquiry deleted successfully'
    });

  } catch (error) {
    console.error('Delete inquiry error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid inquiry ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete inquiry'
    });
  }
};

// @desc    Get inquiry statistics
// @route   GET /api/inquiries/stats
// @access  Private/Admin
const getInquiryStats = async (req, res) => {
  try {
    const stats = await Inquiry.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalInquiries = await Inquiry.countDocuments();
    const newInquiries = await Inquiry.countDocuments({ status: 'new' });
    const contactedInquiries = await Inquiry.countDocuments({ status: 'contacted' });
    const followUpInquiries = await Inquiry.countDocuments({ status: 'follow-up' });
    const convertedInquiries = await Inquiry.countDocuments({ status: 'converted' });
    const closedInquiries = await Inquiry.countDocuments({ status: 'closed' });

    // Get recent inquiries
    const recentInquiries = await Inquiry.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('service', 'name');

    // Generate weekly data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 days including today
    
    const weeklyData = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Create an array for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Set time to beginning of day for comparison
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const dayInquiries = await Inquiry.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      
      weeklyData.push({
        day: daysOfWeek[date.getDay()],
        inquiries: dayInquiries,
        revenue: dayInquiries * 50 // Assuming $50 per inquiry as an example
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          total: totalInquiries,
          new: newInquiries,
          contacted: contactedInquiries,
          followUp: followUpInquiries,
          converted: convertedInquiries,
          closed: closedInquiries,
          breakdown: stats
        },
        recent: recentInquiries,
        weeklyData: weeklyData // Add weekly data to response
      }
    });

  } catch (error) {
    console.error('Get inquiry stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inquiry statistics'
    });
  }
};

// @desc    Get pending follow-ups
// @route   GET /api/inquiries/pending-followups
// @access  Private/Admin
const getPendingFollowUps = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingFollowUps = await Inquiry.find({
      status: { $in: ['contacted', 'follow-up'] },
      followUpDate: { $lte: today },
      $or: [
        { status: 'follow-up' },
        { followUpDate: { $exists: true } }
      ]
    })
    .populate('service', 'name')
    .populate('assignedTo', 'name email')
    .sort({ followUpDate: 1 });

    res.status(200).json({
      status: 'success',
      data: {
        pendingFollowUps
      }
    });

  } catch (error) {
    console.error('Get pending follow-ups error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pending follow-ups'
    });
  }
};

module.exports = {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  getInquiryStats,
  getPendingFollowUps
};