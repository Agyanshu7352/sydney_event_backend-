// Main server file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
// const MongoStore = require('connect-mongo')(session);
const passport = require('./config/passport');
const connectDB = require('./config/database');
const schedulerService = require('./services/scheduler.service');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const Logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const eventsRoutes = require('./routes/events.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware - CORS must come before session
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with MongoStore
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  // No store - uses memory (fine for development)
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
  name: 'sessionId',
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging
app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.path}`, {
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user ? req.user.email : 'none'
  });
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sydney Events API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      events: '/api/events',
      dashboard: '/api/dashboard'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  Logger.success(`🚀 Server running on port ${PORT}`);
  Logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  Logger.info(`Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Not configured'}`);

  // Start scheduled scraping
  if (process.env.NODE_ENV !== 'development' || process.env.AUTO_SCRAPE === 'true') {
    Logger.info('Starting automatic scraping scheduler...');
    schedulerService.startAll();
  } else {
    Logger.warning('Automatic scraping is disabled in development mode');
    Logger.info('To enable: Set AUTO_SCRAPE=true in .env or run: npm run scrape');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM signal received: closing HTTP server');
  schedulerService.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('SIGINT signal received: closing HTTP server');
  schedulerService.stopAll();
  process.exit(0);
});

module.exports = app;