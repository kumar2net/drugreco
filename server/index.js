const express = require('express');
const cors = require('cors');
const path = require('path');
const knex = require('knex');
require('dotenv').config();

// Knex configuration for Railway
const knexConfig = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'drugreco_dev',
      user: process.env.DB_USER || 'kumar',
      password: process.env.DB_PASSWORD
    }
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:3000', 'https://your-app.railway.app'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Error logging utility
function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${context}:`, {
    message: error.message,
    stack: error.stack,
    ...(error.code && { code: error.code })
  });
}

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
  logError(err, `${req.method} ${req.path}`);
  
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json(createResponse(false, null, 'Database connection error'));
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json(createResponse(false, null, 'Validation error', err.errors));
  }
  
  res.status(500).json(createResponse(false, null, 'Internal server error'));
}

// Input validation middleware
function validateSearchInput(req, res, next) {
  const { query, category } = req.query;
  
  if (query) {
    const sanitizedQuery = query.replace(/[^\w\s-]/gi, '').trim().substring(0, 100);
    if (sanitizedQuery !== query) {
      return res.status(400).json({ message: 'Invalid characters in search query' });
    }
    req.query.query = sanitizedQuery;
  }
  
  if (category && category !== 'all') {
    const allowedCategories = ['Diabetes', 'Pain Relief', 'Antibiotics', 'Hypertension', 'Cardiovascular', 'Antiallergic', 'Gastrointestinal'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category parameter' });
    }
  }
  
  next();
}

// Database initialization
let db = null;
function getDB() {
  if (!db) {
    const environment = process.env.NODE_ENV || 'development';
    db = knex(knexConfig[environment]);
  }
  return db;
}

// API Routes
app.get('/api/drugs', async (req, res, next) => {
  try {
    const drugs = await getDB()('drugs').select('*');
    const transformedDrugs = drugs.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    }));
    res.json(transformedDrugs);
  } catch (err) {
    next(err);
  }
});

app.get('/api/search', validateSearchInput, async (req, res, next) => {
  const { query, category } = req.query;
  try {
    let dbQuery = getDB()('drugs');
    if (category && category !== 'all') {
      dbQuery = dbQuery.where({ category });
    }
    if (query) {
      dbQuery = dbQuery.where('name', 'ilike', `%${query}%`);
    }
    const drugs = await dbQuery.select('*');
    const transformedDrugs = drugs.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    }));
    res.json(transformedDrugs);
  } catch (err) {
    next(err);
  }
});

app.get('/api/categories', async (req, res, next) => {
  try {
    const categories = await getDB()('drugs').distinct('category').orderBy('category');
    res.json(['all', ...categories.map(c => c.category)]);
  } catch (err) {
    next(err);
  }
});

app.get('/api/trending', async (req, res, next) => {
  try {
    const trending = await getDB()('drugs').orderBy('price', 'desc').limit(5);
    res.json(trending.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    })));
  } catch (err) {
    next(err);
  }
});

app.get('/api/stats', async (req, res, next) => {
  try {
    const stats = await getDB()('drugs')
      .select('category')
      .count('* as count')
      .avg('price as avgPrice')
      .groupBy('category');
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

app.post('/api/drugs/by-names', async (req, res, next) => {
  const { names } = req.body;
  if (!names || !Array.isArray(names)) {
    return res.status(400).json({ message: '`names` must be an array of drug names.' });
  }

  try {
    const drugs = await getDB()('drugs').whereIn('name', names);
    res.json(drugs.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    })));
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
  console.log(`🚂 Railway server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; 