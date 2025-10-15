const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

// Import routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const learningHubRouter = require('./routes/learning-hub');
const forumRouter = require('./routes/forum');
const wellnessRouter = require('./routes/wellness');
const handbookRouter = require('./routes/handbook');
const apiRouter = require('./routes/api');

// Import API routes
const apiAuthRouter = require('./routes/api/auth');
const apiForumRouter = require('./routes/api/forum');
const apiLearningRouter = require('./routes/api/learning');
const apiWellnessRouter = require('./routes/api/wellness');
const apiDocumentsRouter = require('./routes/api/documents');
const apiNotificationsRouter = require('./routes/api/notifications');
const apiChatbotRouter = require('./routes/api/chatbot');

// Import middleware
const { 
    globalErrorHandler, 
    requestLogger,
    securityHeaders,
    corsForAPI
} = require('./middleware/errorHandler');

// Import passport configuration
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('public'));

// View engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ussh_freshers_hub';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${MONGODB_URI}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Create indexes for better performance
mongoose.connection.once('open', async () => {
    try {
        // Create text indexes for search functionality
        await mongoose.connection.db.collection('forumposts').createIndex({
            title: 'text',
            content: 'text'
        });
        
        await mongoose.connection.db.collection('courses').createIndex({
            title: 'text',
            description: 'text',
            instructor: 'text'
        });
        
        await mongoose.connection.db.collection('documents').createIndex({
            title: 'text',
            description: 'text',
            content: 'text'
        });
        
        console.log('📝 Database indexes created successfully');
    } catch (error) {
        console.log('⚠️  Index creation warning:', error.message);
    }
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'ussh-freshers-hub-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages middleware
const flash = require('express-flash');
app.use(flash());

// Global variables for views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.currentPath = req.path;
  res.locals.moment = require('moment');
  next();
});

// API Routes (with authentication and error handling)
app.use('/api/auth', apiAuthRouter);
app.use('/api/forum', apiForumRouter);
app.use('/api/learning', apiLearningRouter);
app.use('/api/wellness', apiWellnessRouter);
app.use('/api/documents', apiDocumentsRouter);
app.use('/api/notifications', apiNotificationsRouter);
app.use('/api/chatbot', apiChatbotRouter);

// Web Routes (server-side rendered pages)
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/learning-hub', learningHubRouter);
app.use('/forum', forumRouter);
app.use('/wellness', wellnessRouter);
app.use('/handbook', handbookRouter);
app.use('/api', apiRouter);

// Health check endpoint for production monitoring
app.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: require('./package.json').version,
      services: {
        database: 'checking',
        memory: 'ok',
        disk: 'ok'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    };

    // Check database connectivity
    if (mongoose.connection.readyState === 1) {
      healthCheck.services.database = 'connected';
      // Quick ping to database
      await mongoose.connection.db.admin().ping();
      healthCheck.services.database = 'ok';
    } else {
      healthCheck.services.database = 'disconnected';
      healthCheck.status = 'degraded';
    }

    // Memory usage check
    const memoryUsagePercent = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      healthCheck.services.memory = 'high';
      healthCheck.status = 'degraded';
    }

    res.status(healthCheck.status === 'ok' ? 200 : 503).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Page Not Found - USSH Freshers Hub',
    message: 'The page you are looking for does not exist.'
  });
});

// Global error handler for APIs and web routes
app.use(globalErrorHandler);

const server = app.listen(PORT, () => {
  console.log('🚀 Server Status:');
  console.log(`   🌐 Running on: http://localhost:${PORT}`);
  console.log(`   📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   🕐 Started at: ${new Date().toLocaleString()}`);
  console.log('');
  console.log('📚 Available API endpoints:');
  console.log('   🔐 Authentication: /api/auth');
  console.log('   💬 Forum: /api/forum');
  console.log('   📖 Learning: /api/learning');
  console.log('   💚 Wellness: /api/wellness');
  console.log('   📄 Documents: /api/documents');
  console.log('   🔔 Notifications: /api/notifications');
  console.log('   🤖 Chatbot: /api/chatbot');
  console.log('');
  console.log('🌐 Web routes:');
  console.log('   🏠 Home: /');
  console.log('   📚 Learning Hub: /learning-hub');
  console.log('   💬 Forum: /forum');
  console.log('   💚 Wellness: /wellness');
  console.log('   📖 Handbook: /handbook');
});

// Socket.io setup for real-time features
const { Server } = require('socket.io');
const SocketService = require('./services/socketService');
const NotificationService = require('./services/notificationService');

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? false 
      : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize real-time services
const socketService = new SocketService(io);
const notificationService = new NotificationService(socketService);

// Make services available globally
global.socketService = socketService;
global.notificationService = notificationService;

console.log('🔄 Real-time services initialized:');
console.log('   🔌 Socket Service: Active');
console.log('   🔔 Notification Service: Active');

// Additional chatbot handling
io.on('connection', (socket) => {
  // Handle chatbot conversations
  socket.on('chatbot-message', async (data) => {
    try {
      const chatbotService = require('./services/chatbot');
      const response = await chatbotService.processMessage(data.message, data.userId);
      socket.emit('chatbot-response', response);
    } catch (error) {
      console.error('Chatbot error:', error);
      socket.emit('chatbot-error', { 
        message: 'Sorry, I\'m having trouble right now. Please try again.',
        timestamp: new Date()
      });
    }
  });

  // Admin monitoring features
  socket.on('admin-get-stats', async (data) => {
    const userId = socketService.userSockets.get(socket.id);
    if (!userId) return;

    try {
      const user = await User.findById(userId);
      if (user && user.role === 'admin') {
        const stats = {
          onlineUsers: socketService.getOnlineUsersCount(),
          connectedUsers: socketService.getAllConnectedUsers(),
          activeRooms: Array.from(socketService.roomUsers.keys()),
          serverUptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        };
        socket.emit('admin-stats', stats);
      }
    } catch (error) {
      console.error('Admin stats error:', error);
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('👋 Process terminated');
    mongoose.connection.close();
  });
});

module.exports = app;