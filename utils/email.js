const nodemailer = require('nodemailer');

// Create reusable transporter object using the default SMTP transport
const createTransporter = () => {
  // Check if all required environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
    return null;
  }

  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // For Gmail, you might need to use OAuth2 or app passwords
    // Alternative: Use SMTP settings directly
    ...(process.env.EMAIL_HOST && {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    }),
    // Additional options for Gmail with app password
    tls: {
      rejectUnauthorized: false // This helps with self-signed certificates
    }
  });
};

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.error('❌ Transporter not created due to missing configuration');
      return false;
    }
    
    await transporter.verify();
    console.log('✅ Email configuration verified');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    return false;
  }
};

// Send email function
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.error('❌ Cannot send email: transporter not created');
      return { success: false, error: 'Email transporter not configured' };
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
      ...(text && { text })
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId, result };
  } catch (error) {
    console.error('📧 Email sending error:', error);
    console.error('📧 Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return { success: false, error: error.message };
  }
};

module.exports = {
  createTransporter,
  verifyEmailConfig,
  sendEmail
};