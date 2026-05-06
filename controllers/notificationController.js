const Notification = require('../models/Notification');
const User = require('../models/User');
const Inquiry = require('../models/Inquiry');
const { sendEmail } = require('../utils/email');
const cron = require('node-cron');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status = 'unread' } = req.query;

    // Build filter object
    let filter = { userId: req.user._id };
    
    if (type) {
      filter.type = type;
    }
    
    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(filter)
      .populate('inquiryId', 'name email service status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          hasNext: skip + notifications.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch notifications'
    });
  }
};

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('inquiryId', 'name email service status');

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        notification
      }
    });

  } catch (error) {
    console.error('Get notification by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid notification ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch notification'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'read', readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    // Emit real-time notification update if socket is available
    if (global.emitNotification) {
      global.emitNotification(req.user._id.toString(), notification);
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
      data: {
        notification
      }
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid notification ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark notification as read'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, status: 'unread' },
      { status: 'read', readAt: new Date() }
    );

    // Emit real-time notification update if socket is available
    if (global.emitNotification) {
      // Get updated unread count to send to the client
      const unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        status: 'unread'
      });
      
      const updateNotification = {
        type: 'all-notifications-read',
        title: 'All Notifications Read',
        message: `All notifications have been marked as read`,
        data: { unreadCount: 0 },
        timestamp: new Date()
      };
      
      global.emitNotification(req.user._id.toString(), updateNotification);
    }

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark all notifications as read'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid notification ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete notification'
    });
  }
};

// @desc    Send email notification
// @route   POST /api/notifications/send-email
// @access  Private
const sendEmailNotification = async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    // Create transporter
    const result = await sendEmail({ to, subject, html });

    res.status(200).json({
      status: 'success',
      message: 'Email sent successfully',
      data: {
        messageId: result.messageId
      }
    });

  } catch (error) {
    console.error('Send email notification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send email notification',
      error: error.message
    });
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      status: 'unread'
    });

    res.status(200).json({
      status: 'success',
      data: {
        unreadCount: count
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get unread count'
    });
  }
};

// Function to schedule follow-up reminders
const scheduleFollowUpReminders = () => {
  // Run every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Checking for follow-up reminders...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find inquiries with follow-up dates today or overdue
      const pendingFollowUps = await Inquiry.find({
        status: { $in: ['contacted', 'follow-up'] },
        followUpDate: { $lte: today },
        $or: [
          { status: 'follow-up' },
          { followUpDate: { $exists: true } }
        ]
      }).populate('assignedTo', 'name email');

      // Create notifications and send emails for each pending follow-up
      for (const inquiry of pendingFollowUps) {
        const admins = await User.find({ role: { $in: ['admin', 'owner'] }, isActive: true });
        
        for (const admin of admins) {
          // Determine if this is an overdue follow-up
          const isOverdue = new Date(inquiry.followUpDate) < today;
          
          const notificationType = isOverdue ? 'follow-up-overdue' : 'follow-up-due';
          const title = isOverdue ? 'Overdue Follow-up Alert' : 'Follow-up Reminder';
          
          const notification = await Notification.create({
            userId: admin._id,
            type: notificationType,
            title,
            message: `${title} for ${inquiry.name}. Service: ${inquiry.serviceName || (await inquiry.populate('service')).service?.name || 'N/A'}`,
            inquiryId: inquiry._id,
            sentVia: { email: false, inApp: true }
          });
          
          // Emit real-time notification if socket is available
          if (global.emitNotification) {
            global.emitNotification(admin._id.toString(), notification);
          }
          
          // Send email notification
          if (isOverdue) {
            await sendOverdueReminderEmail(inquiry, admin);
          } else {
            await sendFollowUpReminderEmail(inquiry, admin);
          }
        }
      }

      console.log(`Created ${pendingFollowUps.length} follow-up reminder notifications`);
    } catch (error) {
      console.error('Error scheduling follow-up reminders:', error);
    }
  });
};

// Function to schedule 24-hour reminders for uncontacted inquiries
const schedule24HourReminders = () => {
  // Run every hour to check for uncontacted inquiries older than 24 hours
  cron.schedule('0 * * * *', async () => {
    console.log('Checking for 24-hour reminder inquiries...');
    
    try {
      // Calculate date 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Find inquiries with 'new' status that are older than 24 hours
      const uncontactedInquiries = await Inquiry.find({
        status: 'new',
        createdAt: { $lt: twentyFourHoursAgo },
        notified24HourReminder: { $ne: true } // Ensure we don't send duplicate notifications
      });

      // Create notifications and send alerts for each uncontacted inquiry
      for (const inquiry of uncontactedInquiries) {
        const admins = await User.find({ role: { $in: ['admin', 'owner'] }, isActive: true });
        
        for (const admin of admins) {
          const notification = await Notification.create({
            userId: admin._id,
            type: '24hour-reminder',
            title: '24-Hour Follow-up Reminder',
            message: `Reminder: Inquiry from ${inquiry.name} has been uncontacted for 24 hours. Service: ${inquiry.serviceName || 'N/A'}`,
            inquiryId: inquiry._id,
            sentVia: { email: false, inApp: true, whatsapp: false }
          });
          
          // Emit real-time notification if socket is available
          if (global.emitNotification) {
            global.emitNotification(admin._id.toString(), notification);
          }
          
          // Send email notification
          await send24HourReminderEmail(inquiry, admin);
          
          // Send WhatsApp notification
          await send24HourReminderWhatsApp(inquiry, admin);
        }
        
        // Mark that this inquiry has been notified to prevent duplicate notifications
        inquiry.notified24HourReminder = true;
        await inquiry.save();
      }

      console.log(`Created ${uncontactedInquiries.length} 24-hour reminder notifications`);
    } catch (error) {
      console.error('Error scheduling 24-hour reminders:', error);
    }
  });
};

// Function to send new inquiry email notifications
const sendNewInquiryEmail = async (inquiry) => {
  try {
    // Get all admins for email
    const admins = await User.find({ role: { $in: ['admin', 'owner'] }, isActive: true });
    
    if (!admins || admins.length === 0) {
      console.log('No active admin users found for email notifications');
      return;
    }

    for (const admin of admins) {
      const result = await sendEmail({
        to: admin.email,
        subject: `New Inquiry Received - ${inquiry.name} | GYM CRM System`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">📋 New Inquiry Received</h2>
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Inquiry Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Name:</strong></td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${inquiry.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${inquiry.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Phone:</strong></td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${inquiry.phone}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Service:</strong></td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${inquiry.serviceName || (await inquiry.populate('service')).service?.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Message:</strong></td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${inquiry.message || 'No message provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Preferred Time:</strong></td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${inquiry.preferredTime || 'Not specified'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Submitted:</strong></td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleString() : 'N/A'}</td>
                </tr>
              </table>
            </div>
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e;"><strong>Action Required:</strong> Please check your CRM panel for more details and to respond to this inquiry.</p>
              <p style="margin: 10px 0 0 0;"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/inquiries" style="background-color: #f97316; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">View Inquiry in CRM</a></p>
            </div>
          </div>
        `
      });
      
      if (result.success) {
        console.log(`📧 New inquiry email sent successfully to ${admin.email}`);
      } else {
        console.error(`📧 Failed to send new inquiry email to ${admin.email}:`, result.error);
      }
    }
  } catch (error) {
    console.error('📧 Error sending new inquiry email:', error);
  }
};

// Function to send new inquiry WhatsApp notifications
const sendNewInquiryWhatsApp = async (inquiry) => {
  try {
    // Get WhatsApp number from environment variable
    const whatsappNumber = process.env.WHATSAPP_ADMIN_NUMBER || '8849522577';
    const encodedMessage = encodeURIComponent(`🎉 New Inquiry Received!

Name: ${inquiry.name}
Email: ${inquiry.email}
Phone: ${inquiry.phone}
Service: ${inquiry.serviceName || 'N/A'}
Message: ${inquiry.message || 'No message'}
Preferred Time: ${inquiry.preferredTime || 'Not specified'}

Please check your CRM panel for more details.`);
    
    // Log the intended WhatsApp message
    console.log(`WhatsApp message intended for ${whatsappNumber}: ${encodedMessage}`);
    
    // In a real implementation, you would integrate with a WhatsApp Business API provider
    // For now, we'll just log the intended WhatsApp message
    // You can integrate with actual WhatsApp API later
    
  } catch (error) {
    console.error('Error sending new inquiry WhatsApp notification:', error);
  }
};

// Function to send follow-up reminder emails
const sendFollowUpReminderEmail = async (inquiry, admin) => {
  try {
    await sendEmail({
      to: admin.email,
      subject: 'Follow-up Reminder - GYM CRM System',
      html: `
        <h2>Follow-up Reminder</h2>
        <p><strong>Name:</strong> ${inquiry.name}</p>
        <p><strong>Email:</strong> ${inquiry.email}</p>
        <p><strong>Phone:</strong> ${inquiry.phone}</p>
        <p><strong>Service:</strong> ${inquiry.serviceName || (await inquiry.populate('service')).service?.name || 'N/A'}</p>
        <p><strong>Status:</strong> ${inquiry.status}</p>
        <p><strong>Follow-up Date:</strong> ${inquiry.followUpDate}</p>
        <p><strong>Notes:</strong> ${inquiry.notes || 'No notes'}</p>
        <hr>
        <p>Please check your CRM panel to follow up.</p>
      `
    });
  } catch (error) {
    console.error('Error sending follow-up reminder email:', error);
  }
};

// Function to send overdue reminder emails
const sendOverdueReminderEmail = async (inquiry, admin) => {
  try {
    await sendEmail({
      to: admin.email,
      subject: 'Overdue Follow-up - GYM CRM System',
      html: `
        <h2>Overdue Follow-up Alert</h2>
        <p><strong>⚠️ URGENT: This follow-up is overdue!</strong></p>
        <p><strong>Name:</strong> ${inquiry.name}</p>
        <p><strong>Email:</strong> ${inquiry.email}</p>
        <p><strong>Phone:</strong> ${inquiry.phone}</p>
        <p><strong>Service:</strong> ${inquiry.serviceName || (await inquiry.populate('service')).service?.name || 'N/A'}</p>
        <p><strong>Status:</strong> ${inquiry.status}</p>
        <p><strong>Follow-up Date:</strong> ${inquiry.followUpDate}</p>
        <p><strong>Days Overdue:</strong> ${Math.floor((Date.now() - new Date(inquiry.followUpDate)) / (1000 * 60 * 60 * 24))}</p>
        <p><strong>Notes:</strong> ${inquiry.notes || 'No notes'}</p>
        <hr>
        <p>Please check your CRM panel to address this urgent follow-up.</p>
      `
    });
  } catch (error) {
    console.error('Error sending overdue reminder email:', error);
  }
};

// Function to send 24-hour reminder emails
const send24HourReminderEmail = async (inquiry, admin) => {
  try {
    await sendEmail({
      to: admin.email,
      subject: '24-Hour Uncontacted Inquiry - GYM CRM System',
      html: `
        <h2>24-Hour Uncontacted Inquiry Alert</h2>
        <p><strong>⚠️ URGENT: This inquiry has not been contacted for 24 hours!</strong></p>
        <p><strong>Name:</strong> ${inquiry.name}</p>
        <p><strong>Email:</strong> ${inquiry.email}</p>
        <p><strong>Phone:</strong> ${inquiry.phone}</p>
        <p><strong>Service:</strong> ${inquiry.serviceName || 'N/A'}</p>
        <p><strong>Message:</strong> ${inquiry.message || 'No message'}</p>
        <p><strong>Submitted:</strong> ${inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleString() : 'N/A'}</p>
        <hr>
        <p>Please check your CRM panel to contact this inquiry immediately.</p>
      `
    });
  } catch (error) {
    console.error('Error sending 24-hour reminder email:', error);
  }
};

// Function to send 24-hour reminder WhatsApp notifications
const send24HourReminderWhatsApp = async (inquiry, admin) => {
  try {
    // Get WhatsApp number from environment variable
    const whatsappNumber = process.env.WHATSAPP_ADMIN_NUMBER || '8849522577';
    const encodedMessage = encodeURIComponent(`⚠️ 24-Hour Uncontacted Inquiry Alert

Name: ${inquiry.name}
Email: ${inquiry.email}
Phone: ${inquiry.phone}
Service: ${inquiry.serviceName || 'N/A'}
Message: ${inquiry.message || 'No message'}
Submitted: ${inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleString() : 'N/A'}

Please check your CRM panel to contact this inquiry immediately.`);
    
    // Log the intended WhatsApp message
    console.log(`WhatsApp message intended for ${whatsappNumber}: ${encodedMessage}`);
    
    // In a real implementation, you would integrate with a WhatsApp Business API provider
    // For now, we'll just log the intended WhatsApp message
    // You can integrate with actual WhatsApp API later
    
  } catch (error) {
    console.error('Error sending 24-hour reminder WhatsApp:', error);
  }
};

// Initialize scheduled tasks
scheduleFollowUpReminders();
schedule24HourReminders();

module.exports = {
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  sendEmailNotification,
  getUnreadCount,
  scheduleFollowUpReminders,
  sendNewInquiryEmail,
  sendFollowUpReminderEmail,
  sendOverdueReminderEmail,
  send24HourReminderEmail,
  send24HourReminderWhatsApp,
  sendNewInquiryWhatsApp  // Export the new function
};
