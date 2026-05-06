const mongoose = require('mongoose');

// Middleware to validate ObjectId parameters
const validateObjectId = (req, res, next) => {
  // Check if the id parameter exists and is a valid ObjectId
  if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid ID format. ID must be a 24-character hexadecimal string.'
    });
  }
  next();
};

module.exports = {
  validateObjectId
};