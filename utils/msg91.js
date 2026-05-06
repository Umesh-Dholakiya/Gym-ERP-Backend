const axios = require('axios');

class MSG91Service {
  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.senderId = process.env.MSG91_SENDER_ID;
    this.baseUrl = 'https://api.msg91.com';
  }

  // Send SMS
  async sendSMS(to, message) {
    try {
      if (!this.authKey) {
        console.error('MSG91_AUTH_KEY not configured');
        return { success: false, error: 'MSG91 not configured' };
      }

      const response = await axios.post(`${this.baseUrl}/api/v5/otp?authkey=${this.authKey}`, {
        template_id: process.env.MSG91_SMS_TEMPLATE_ID || 'your-sms-template-id',
        mobile: to,
        message: message,
        sender: this.senderId
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error sending SMS:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Send WhatsApp message
  async sendWhatsApp(to, templateId, params) {
    try {
      if (!this.authKey) {
        console.error('MSG91_AUTH_KEY not configured');
        return { success: false, error: 'MSG91 not configured' };
      }

      const payload = {
        mobile: to,
        template_id: templateId || process.env.MSG91_WHATSAPP_TEMPLATE_ID,
        variables_values: params.join('|'),
        sender: this.senderId
      };

      const response = await axios.post(`${this.baseUrl}/whatsapp/message/send`, payload, {
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json'
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Send OTP
  async sendOTP(mobile, templateId) {
    try {
      if (!this.authKey) {
        console.error('MSG91_AUTH_KEY not configured');
        return { success: false, error: 'MSG91 not configured' };
      }

      const response = await axios.post(`${this.baseUrl}/api/v5/otp?authkey=${this.authKey}`, {
        template_id: templateId || process.env.MSG91_OTP_TEMPLATE_ID,
        mobile: mobile
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error sending OTP:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP
  async verifyOTP(mobile, otp) {
    try {
      if (!this.authKey) {
        console.error('MSG91_AUTH_KEY not configured');
        return { success: false, error: 'MSG91 not configured' };
      }

      const response = await axios.get(`${this.baseUrl}/api/v5/otp/verify?authkey=${this.authKey}&mobile=${mobile}&otp=${otp}`);

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error verifying OTP:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Make a voice call
  async makeVoiceCall(to, templateId) {
    try {
      if (!this.authKey) {
        console.error('MSG91_AUTH_KEY not configured');
        return { success: false, error: 'MSG91 not configured' };
      }

      const response = await axios.post(`${this.baseUrl}/voice/call`, {
        mobile: to,
        template_id: templateId,
        authkey: this.authKey
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error making voice call:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Send bulk messages
  async sendBulkMessages(recipients, message) {
    try {
      if (!this.authKey) {
        console.error('MSG91_AUTH_KEY not configured');
        return { success: false, error: 'MSG91 not configured' };
      }

      const response = await axios.post(`${this.baseUrl}/api/v5/bulk-sms`, {
        mobiles: recipients.join(','),
        message: message,
        sender: this.senderId,
        authkey: this.authKey
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error sending bulk messages:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new MSG91Service();