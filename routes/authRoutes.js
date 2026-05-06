const express = require('express');
const router = express.Router();
const { login, register, logout, getMe, updatePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', login);
router.post('/register', register); // Add registration route

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/password', protect, updatePassword);

module.exports = router;