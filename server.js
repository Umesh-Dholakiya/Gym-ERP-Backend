const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Import notification controller to initialize scheduled tasks
const { scheduleFollowUpReminders } = require('./controllers/notificationController');

// Database connection
const connectDB = require('./config/db');

// Initialize app
const app = express();
const server = http.createServer(app);

// Connect to database
connectDB();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net"],
      fontSrc: ["'self'", "fonts.gstatic.com", "data:", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "cdn.jsdelivr.net"],
      frameSrc: ["'self'", "youtube.com", "youtu.be", "maps.google.com", "maps.googleapis.com"]
    },
  },
  crossOriginEmbedderPolicy: false,
})); 

app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://gym-erp-eta.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

if (process.env.NODE_ENV === 'production') {
  const accessLogStream = require('fs').createWriteStream(
    require('path').join(__dirname, 'logs', 'access.log'), 
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 500
});

app.use('/api/', speedLimiter);
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/inquiries', require('./routes/inquiryRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/plans', require('./routes/membershipPlanRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/trainers', require('./routes/trainerRoutes'));
app.use('/api/classes', require('./routes/classScheduleRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Initialize Socket.IO with advanced settings from dev
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://gym-erp-eta.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: 25000, // Ping every 25 seconds
  pingTimeout: 20000,   // Wait 20 seconds for pong
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  // Handle user authentication
  socket.on('authenticate', async (token) => {
    try {
      // Verify the JWT token
      const { verifyToken } = require('./utils/jwt');
      const decoded = verifyToken(token);
      
      if (decoded) {
        const User = require('./models/User');
        const user = await User.findById(decoded.id);
        
        if (!user) {
          socket.emit('unauthorized', { success: false, message: 'User not found' });
          socket.disconnect(true);
          return;
        }
        
        const userInfo = {
          userId: decoded.id,
          email: user.email,
          role: user.role
        };
        
        connectedUsers.set(socket.id, { socket, token, userInfo, joinedAt: new Date() });
        socket.join(`user_${decoded.id}`);
        
        if (user.role === 'admin' || user.role === 'owner') {
          socket.join('admins');
        }
        
        socket.emit('authenticated', { success: true, userId: decoded.id, message: 'Authentication successful' });
      } else {
        socket.emit('unauthorized', { success: false, message: 'Invalid token' });
        socket.disconnect(true);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('unauthorized', { success: false, message: 'Authentication failed' });
      socket.disconnect(true);
    }
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', (reason) => {
    const userData = connectedUsers.get(socket.id);
    if (userData) {
      console.log(`👤 Disconnected user: ${userData.userInfo?.email || 'Unknown'}`);
    }
    connectedUsers.delete(socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Emit notifications to users
const emitNotification = (userId, notification) => {
  try {
    const userRooms = io.sockets.adapter.rooms.get(`user_${userId}`);
    if (userRooms && userRooms.size > 0) {
      io.to(`user_${userId}`).emit('newNotification', notification);
      console.log(`🔔 Notification sent to user ${userId}:`, notification.title);
    } else {
      console.log(`🔕 User ${userId} not connected, notification queued`);
    }
  } catch (error) {
    console.error('Error emitting notification:', error);
  }
};

// Broadcast to all admins
const broadcastToAdmins = (event, data) => {
  try {
    const adminRooms = io.sockets.adapter.rooms.get('admins');
    if (adminRooms && adminRooms.size > 0) {
      io.to('admins').emit(event, data);
      console.log(`📢 Broadcast to admins: ${event}`);
    }
  } catch (error) {
    console.error('Error broadcasting to admins:', error);
  }
};

// Make globally available
global.emitNotification = emitNotification;
global.broadcastToAdmins = broadcastToAdmins;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.isJoi) {
    return res.status(400).json({
      status: 'error',
      message: err.details[0].message,
      errors: err.details
    });
  }
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors
    });
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      status: 'error',
      message: `${field} already exists`
    });
  }
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Serve static files from the React app if it exists (for monolithic deployment)
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // 404 handler - catch all routes and return React app
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // If no React app is built/present, just return a simple message for root
  app.get('/', (req, res) => {
    res.send('GYM CRM API is running.');
  });

  // Default 404 for API or other routes
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found'
    });
  });
}

// Initialize scheduled tasks
scheduleFollowUpReminders();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Server with DB connection running');
});

module.exports = app;