console.log('Server starting...');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('./lib/prisma');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('./services/logger');
const config = require('./config/environment');

const app = express();
const PORT = config.get('PORT');

// Security middleware
app.use(helmet());

// Rate limiting configuration
const limiter = rateLimit(config.getRateLimitConfig());
const searchLimiter = rateLimit(config.getSearchRateLimitConfig());

// Speed limiting for API endpoints
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: () => 500 // begin adding 500ms of delay uniformly for each request after delayAfter
});

// Apply rate limiting if enabled
if (config.get('ENABLE_RATE_LIMITING')) {
  app.use('/api/', limiter);
  app.use('/api/search', searchLimiter);
  app.use('/api/', speedLimiter);
}

// CORS configuration
app.use(cors(config.getCorsConfig()));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Request logging middleware
if (config.get('ENABLE_LOGGING')) {
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.logRequest(req, res, duration);
    });
    
    next();
  });
}

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  if (!config.get('ENABLE_AUTHENTICATION')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.logSecurity('Missing authentication token', { url: req.url });
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  jwt.verify(token, config.get('JWT_SECRET'), (err, user) => {
    if (err) {
      logger.logSecurity('Invalid authentication token', { url: req.url, error: err.message });
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    req.user = user;
    next();
  });
};

// Optional authentication for endpoints that can work with or without auth
const optionalAuth = (req, res, next) => {
  if (!config.get('ENABLE_AUTHENTICATION')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, config.get('JWT_SECRET'), (err, user) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
};

// Standardized response utility
function createResponse(success, data = null, message = '', errors = null) {
  return {
    success,
    data,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString()
  };
}

// Global error handler middleware
function errorHandler(err, req, res, next) {
  logger.logError(err, `${req.method} ${req.path}`);
  
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json(createResponse(false, null, 'Database connection error'));
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json(createResponse(false, null, 'Validation error', err.errors));
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json(createResponse(false, null, 'CORS policy violation'));
  }
  
  res.status(500).json(createResponse(false, null, 'Internal server error'));
}

// Input validation middleware
function validateSearchInput(req, res, next) {
  const { query, category } = req.query;
  
  if (query) {
    const sanitizedQuery = query.replace(/[^\w\s-]/gi, '').trim().substring(0, 100);
    if (sanitizedQuery !== query) {
      logger.logSecurity('Invalid search query', { original: query, sanitized: sanitizedQuery });
      return res.status(400).json(createResponse(false, null, 'Invalid characters in search query'));
    }
    req.query.query = sanitizedQuery;
  }
  
  if (category && category !== 'all') {
    const allowedCategories = ['Diabetes', 'Pain Relief', 'Antibiotics', 'Hypertension', 'Cardiovascular', 'Antiallergic', 'Gastrointestinal', 'Supplements', 'Thyroid', 'Sleep Aid'];
    if (!allowedCategories.includes(category)) {
      logger.logSecurity('Invalid category parameter', { category });
      return res.status(400).json(createResponse(false, null, 'Invalid category parameter'));
    }
  }
  
  next();
}

// Prisma client is initialized in lib/prisma.js and reused across the app

// NOTE: The previous Knex-based seed check has been removed.
// If you need to seed the database, create a Prisma-based seed script instead.

// Authentication routes
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json(createResponse(false, null, 'Username, email, and password are required'));
    }
    
    if (password.length < config.get('PASSWORD_MIN_LENGTH')) {
      return res.status(400).json(createResponse(false, null, `Password must be at least ${config.get('PASSWORD_MIN_LENGTH')} characters long`));
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      logger.logAuthentication('register', null, false);
      return res.status(409).json(createResponse(false, null, 'User already exists'));
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.get('BCRYPT_ROUNDS'));
    
    // Create user
    const createdUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        created_at: new Date()
      },
      select: { id: true }
    });
    const userId = createdUser.id;
    
    // Generate JWT token
    const token = jwt.sign(
      { userId, username, email },
      config.get('JWT_SECRET'),
      { expiresIn: config.get('JWT_EXPIRES_IN') }
    );
    
    logger.logAuthentication('register', userId, true);
    res.status(201).json(createResponse(true, { token, user: { id: userId, username, email } }, 'User registered successfully'));
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json(createResponse(false, null, 'Email and password are required'));
    }
    
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.logAuthentication('login', null, false);
      return res.status(401).json(createResponse(false, null, 'Invalid credentials'));
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.logAuthentication('login', user.id, false);
      return res.status(401).json(createResponse(false, null, 'Invalid credentials'));
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      config.get('JWT_SECRET'),
      { expiresIn: config.get('JWT_EXPIRES_IN') }
    );
    
    logger.logAuthentication('login', user.id, true);
    res.json(createResponse(true, { token, user: { id: user.id, username: user.username, email: user.email } }, 'Login successful'));
  } catch (err) {
    next(err);
  }
});

// API Routes with optional authentication
app.get('/api/drugs', optionalAuth, async (req, res, next) => {
  try {
    const startTime = Date.now();
    const drugs = await prisma.drug.findMany();
    const duration = Date.now() - startTime;
    
    logger.logPerformance('get_drugs', duration, { count: drugs.length });
    
    const transformedDrugs = drugs.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    }));
    res.json(createResponse(true, transformedDrugs, 'Drugs retrieved successfully'));
  } catch (err) {
    next(err);
  }
});

app.get('/api/search', validateSearchInput, optionalAuth, async (req, res, next) => {
  const { query, category } = req.query;
  try {
    const startTime = Date.now();
    const where = {};
    if (category && category !== 'all') {
      where.category = category;
    }
    if (query) {
      where.name = { contains: query, mode: 'insensitive' };
    }
    const drugs = await prisma.drug.findMany({ where });
    const duration = Date.now() - startTime;
    
    logger.logPerformance('search_drugs', duration, { query, category, count: drugs.length });
    
    const transformedDrugs = drugs.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    }));
    res.json(createResponse(true, transformedDrugs, 'Search completed successfully'));
  } catch (err) {
    next(err);
  }
});

app.get('/api/categories', optionalAuth, async (req, res, next) => {
  try {
    const startTime = Date.now();
    const categories = await prisma.drug.findMany({
      select: { category: true },
      distinct: ['category']
    });
    const duration = Date.now() - startTime;
    
    logger.logPerformance('get_categories', duration, { count: categories.length });
    
    res.json(createResponse(true, ['all', ...categories.map(c => c.category)], 'Categories retrieved successfully'));
  } catch (err) {
    next(err);
  }
});

app.get('/api/trending', optionalAuth, async (req, res, next) => {
  try {
    const startTime = Date.now();
    const trending = await prisma.drug.findMany({
      orderBy: { price: 'desc' },
      take: 5
    });
    const duration = Date.now() - startTime;
    
    logger.logPerformance('get_trending', duration, { count: trending.length });
    
    const transformedTrending = trending.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    }));
    res.json(createResponse(true, transformedTrending, 'Trending drugs retrieved successfully'));
  } catch (err) {
    next(err);
  }
});

app.get('/api/stats', optionalAuth, async (req, res, next) => {
  try {
    const startTime = Date.now();
    const stats = await prisma.drug
      .groupBy({
        by: ['category'],
        _count: { _all: true },
        _avg: { price: true }
      });
    const duration = Date.now() - startTime;
    
    logger.logPerformance('get_stats', duration, { count: stats.length });
    
    res.json(createResponse(true, stats, 'Statistics retrieved successfully'));
  } catch (err) {
    next(err);
  }
});

app.post('/api/drugs/by-names', optionalAuth, async (req, res, next) => {
  const { names } = req.body;
  if (!names || !Array.isArray(names)) {
    return res.status(400).json(createResponse(false, null, '`names` must be an array of drug names.'));
  }

  try {
    const startTime = Date.now();
    const drugs = await prisma.drug.findMany({
      where: {
        name: {
          in: names
        }
      }
    });
    const duration = Date.now() - startTime;
    
    logger.logPerformance('get_drugs_by_names', duration, { names: names.length, found: drugs.length });
    
    const transformedDrugs = drugs.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    }));
    res.json(createResponse(true, transformedDrugs, 'Drugs retrieved successfully'));
  } catch (err) {
    next(err);
  }
});

// Protected routes (require authentication)
app.get('/api/user/profile', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, username: true, email: true, created_at: true }
    });
    if (!user) {
      return res.status(404).json(createResponse(false, null, 'User not found'));
    }
    res.json(createResponse(true, user, 'Profile retrieved successfully'));
  } catch (err) {
    next(err);
  }
});

// Serve React app for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Apply error handler
app.use(errorHandler);

// Debug log for PORT
logger.info(`PORT from config: ${PORT}, process.env.PORT: ${process.env.PORT}`);

// Start server
app.listen(PORT, () => {
  logger.info(`🚂 Railway server running on port ${PORT}`);
  logger.info(`Environment: ${config.get('NODE_ENV')}`);
});

module.exports = app; 