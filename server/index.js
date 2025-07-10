require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const knex = require('knex');
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
  delayMs: 500 // begin adding 500ms of delay per request above 50
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

// Database initialization
let db = null;
function getDB() {
  if (!db) {
    const environment = config.get('NODE_ENV');
    const knexConfig = config.getDatabaseConfig();
    db = knex(knexConfig[environment]);
    logger.info('Database connection initialized', { environment });
  }
  return db;
}

// Ensure the drugs table is populated in production
async function ensureDrugsSeeded() {
  try {
    // Load JSON to know expected total
    const path = require('path');
    const fs = require('fs');
    const defaultPath = path.join(__dirname, '../../localhost-drugs-export.json');
    const drugsJson = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
    const expectedCount = drugsJson.length;

    const result = await getDB()('drugs').count({ count: 'id' }).first();
    const currentCount = parseInt(result.count ?? result.id ?? 0, 10);

    if (currentCount !== expectedCount) {
      logger.info(`Drugs table count (${currentCount}) does not match JSON (${expectedCount}) – reseeding`);
      const seedScript = require('./db/seeds/02_complete_drugs');
      await seedScript.seed(getDB());
      logger.info('✅ Drug reseed completed successfully');
    } else {
      logger.info(`Drugs table already in sync with ${currentCount} records – no reseed needed`);
    }
  } catch (err) {
    logger.logError(err, 'ensureDrugsSeeded');
  }
}

// Trigger the seed check (fire-and-forget)
ensureDrugsSeeded();

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
    const existingUser = await getDB()('users').where({ email }).first();
    if (existingUser) {
      logger.logAuthentication('register', null, false);
      return res.status(409).json(createResponse(false, null, 'User already exists'));
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.get('BCRYPT_ROUNDS'));
    
    // Create user
    const [userId] = await getDB()('users').insert({
      username,
      email,
      password: hashedPassword,
      created_at: new Date()
    }).returning('id');
    
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
    const user = await getDB()('users').where({ email }).first();
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
    const drugs = await getDB()('drugs').select('*');
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
    let dbQuery = getDB()('drugs');
    if (category && category !== 'all') {
      dbQuery = dbQuery.where({ category });
    }
    if (query) {
      dbQuery = dbQuery.where('name', 'ilike', `%${query}%`);
    }
    const drugs = await dbQuery.select('*');
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
    const categories = await getDB()('drugs').distinct('category').orderBy('category');
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
    const trending = await getDB()('drugs').orderBy('price', 'desc').limit(5);
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
    const stats = await getDB()('drugs')
      .select('category')
      .count('* as count')
      .avg('price as avgPrice')
      .groupBy('category');
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
    const drugs = await getDB()('drugs').whereIn('name', names);
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
    const user = await getDB()('users').where({ id: req.user.userId }).select('id', 'username', 'email', 'created_at').first();
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

// Start server
app.listen(PORT, () => {
  logger.info(`🚂 Railway server running on port ${PORT}`);
  logger.info(`Environment: ${config.get('NODE_ENV')}`);
});

module.exports = app; 