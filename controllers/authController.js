const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { schemas } = require('../middleware/validationMiddleware');


// @desc    Admin login
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // Normalize email: trim whitespace and convert to lowercase
    email = email ? email.trim().toLowerCase() : '';

    // Validate input
    const { error } = schemas.userLogin.validate({ email, password });
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    // Check for user with normalized email
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('Login attempt failed: User not found for email:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('Login attempt failed: Account deactivated for email:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log('Login attempt failed: Invalid password for email:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    console.log('Login successful for user:', user.email);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
};

// @desc    Register admin user
// @route   POST /api/auth/register
// @access  Public (for initial setup only)
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required'
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'admin',
      isActive: true
    });

    // Generate token
    const token = generateToken(user._id);

    console.log('Admin user created successfully:', user.email);

    res.status(201).json({
      status: 'success',
      message: 'Admin user created successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error during registration'
    });
  }
};

// @desc    Admin logout
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during logout'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

module.exports = {
  login,
  register,
  logout,
  getMe,
  updatePassword
};