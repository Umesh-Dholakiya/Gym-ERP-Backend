const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const msg91 = require('../utils/msg91');

// Send OTP
router.post('/otp/send', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { mobile, templateId } = req.body;

    if (!mobile) {
      return res.status(400).json({
        status: 'error',
        message: 'Mobile number is required'
      });
    }

    const result = await msg91.sendOTP(mobile, templateId);
    
    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: 'OTP sent successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during OTP sending'
    });
  }
});

// Verify OTP
router.post('/otp/verify', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Mobile number and OTP are required'
      });
    }

    const result = await msg91.verifyOTP(mobile, otp);
    
    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: 'OTP verified successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to verify OTP',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during OTP verification'
    });
  }
});

// Send WhatsApp message
router.post('/whatsapp/send', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { mobile, templateId, params } = req.body;

    if (!mobile || !params) {
      return res.status(400).json({
        status: 'error',
        message: 'Mobile number and parameters are required'
      });
    }

    const result = await msg91.sendWhatsApp(mobile, templateId, params);
    
    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: 'WhatsApp message sent successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to send WhatsApp message',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during WhatsApp sending'
    });
  }
});

// Send SMS
router.post('/sms/send', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { mobile, message } = req.body;

    if (!mobile || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Mobile number and message are required'
      });
    }

    const result = await msg91.sendSMS(mobile, message);
    
    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: 'SMS sent successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to send SMS',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during SMS sending'
    });
  }
});

// Make voice call
router.post('/call/make', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { mobile, templateId } = req.body;

    if (!mobile) {
      return res.status(400).json({
        status: 'error',
        message: 'Mobile number is required'
      });
    }

    const result = await msg91.makeVoiceCall(mobile, templateId);
    
    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: 'Voice call initiated successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to initiate voice call',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Make voice call error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during voice call initiation'
    });
  }
});

module.exports = router;