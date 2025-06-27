const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const knex = require('knex');
const knexConfig = require('../knexfile.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
  
  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json(createResponse(false, null, 'Database connection error'));
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json(createResponse(false, null, 'Validation error', err.errors));
  }
  
  // Default server error
  res.status(500).json(createResponse(false, null, 'Internal server error'));
}

// Input validation middleware
function validateSearchInput(req, res, next) {
  const { query, category } = req.query;
  
  // Sanitize and validate query parameter
  if (query) {
    // Remove SQL injection characters and limit length
    const sanitizedQuery = query.replace(/[^\w\s-]/gi, '').trim().substring(0, 100);
    if (sanitizedQuery !== query) {
      return res.status(400).json({ message: 'Invalid characters in search query' });
    }
    req.query.query = sanitizedQuery;
  }
  
  // Validate category parameter
  if (category && category !== 'all') {
    const allowedCategories = ['Diabetes', 'Pain Relief', 'Antibiotics', 'Hypertension', 'Cardiovascular', 'Antiallergic', 'Gastrointestinal'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category parameter' });
    }
  }
  
  next();
}

// Lazy database initialization
let db = null;
function getDB() {
  if (!db) {
    const environment = process.env.NODE_ENV || 'production';
    db = knex(knexConfig[environment]);
  }
  return db;
}

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
      // Use parameterized query for safety
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

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getDB()('drugs').distinct('category').orderBy('category');
    res.json(['all', ...categories.map(c => c.category)]);
  } catch (err) {
    res.status(500).json({ message: "Error fetching categories", error: err.message });
  }
});

app.get('/api/trending', async (req, res) => {
  try {
    const trending = await getDB()('drugs').orderBy('price', 'desc').limit(5);
    res.json(trending.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    })));
  } catch (err) {
    res.status(500).json({ message: "Error fetching trending drugs", error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getDB()('drugs')
      .select('category')
      .count('* as count')
      .avg('price as avgPrice')
      .groupBy('category');
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: "Error fetching stats", error: err.message });
  }
});

app.post('/api/drugs/by-names', async (req, res) => {
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
    res.status(500).json({ message: 'Error fetching drugs by names', error: err.message });
  }
});

app.post('/api/drugs', async (req, res) => {
  const { name, category, combination, strength, dosageForm, manufacturer, price, sideEffects, alternatives } = req.body;
  
  if (!name || !category) {
    return res.status(400).json({ message: 'Name and category are required fields.' });
  }

  try {
    const [insertedDrug] = await getDB()('drugs').insert({
      name,
      category,
      combination,
      strength,
      dosageForm,
      manufacturer,
      price,
      sideEffects: JSON.stringify(sideEffects || []),
      alternatives: JSON.stringify(alternatives || [])
    }).returning('*');
    
    res.status(201).json({
      ...insertedDrug,
      sideEffects: typeof insertedDrug.sideEffects === 'string' ? JSON.parse(insertedDrug.sideEffects) : insertedDrug.sideEffects,
      alternatives: typeof insertedDrug.alternatives === 'string' ? JSON.parse(insertedDrug.alternatives) : insertedDrug.alternatives
    });
  } catch (err) {
    res.status(500).json({ message: 'Error adding drug', error: err.message });
  }
});

app.post('/api/query', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

  try {
    const result = await processNaturalLanguageQuery(query);
    res.json({
      query: query,
      interpretation: result.interpretation,
      results: result.data
    });
  } catch (err) {
    res.status(500).json({ message: 'Error processing query', error: err.message });
  }
});

async function processNaturalLanguageQuery(query) {
  const lowerQuery = query.toLowerCase();
  let dbQuery = getDB()('drugs');
  let interpretation = '';

  // Category-based queries
  if (lowerQuery.includes('diabetes') || lowerQuery.includes('diabetic')) {
    dbQuery = dbQuery.where({ category: 'Diabetes' });
    interpretation = 'Searching for diabetes medications';
  } else if (lowerQuery.includes('pain') || lowerQuery.includes('ache') || lowerQuery.includes('relief')) {
    dbQuery = dbQuery.where({ category: 'Pain Relief' });
    interpretation = 'Searching for pain relief medications';
  } else if (lowerQuery.includes('antibiotic') || lowerQuery.includes('infection')) {
    dbQuery = dbQuery.where({ category: 'Antibiotics' });
    interpretation = 'Searching for antibiotics';
  } else if (lowerQuery.includes('hypertension') || lowerQuery.includes('blood pressure') || lowerQuery.includes('bp')) {
    dbQuery = dbQuery.where({ category: 'Hypertension' });
    interpretation = 'Searching for blood pressure medications';
  } else if (lowerQuery.includes('heart') || lowerQuery.includes('cardiac') || lowerQuery.includes('cardiovascular')) {
    dbQuery = dbQuery.where({ category: 'Cardiovascular' });
    interpretation = 'Searching for cardiovascular medications';
  } else if (lowerQuery.includes('allergy') || lowerQuery.includes('allergic')) {
    dbQuery = dbQuery.where({ category: 'Antiallergic' });
    interpretation = 'Searching for allergy medications';
  } else if (lowerQuery.includes('stomach') || lowerQuery.includes('gastro') || lowerQuery.includes('acid')) {
    dbQuery = dbQuery.where({ category: 'Gastrointestinal' });
    interpretation = 'Searching for gastrointestinal medications';
  }

  // Price-based queries
  if (lowerQuery.includes('cheap') || lowerQuery.includes('affordable') || lowerQuery.includes('low cost')) {
    dbQuery = dbQuery.orderBy('price', 'asc').limit(10);
    interpretation += ' - sorted by lowest price';
  } else if (lowerQuery.includes('expensive') || lowerQuery.includes('high cost') || lowerQuery.includes('premium')) {
    dbQuery = dbQuery.orderBy('price', 'desc').limit(10);
    interpretation += ' - sorted by highest price';
  }

  // Specific drug name queries
  if (lowerQuery.includes('paracetamol') || lowerQuery.includes('acetaminophen')) {
    dbQuery = dbQuery.where('name', 'like', '%paracetamol%').orWhere('name', 'like', '%dolo%');
    interpretation = 'Searching for paracetamol-based medications';
  } else if (lowerQuery.includes('metformin')) {
    dbQuery = dbQuery.where('name', 'like', '%metformin%');
    interpretation = 'Searching for metformin-based medications';
  }

  // Fallback to general search
  if (!interpretation) {
    dbQuery = dbQuery.where('name', 'like', `%${query}%`);
    interpretation = `General search for "${query}"`;
  }

  const data = await dbQuery.select('*');
  return {
    interpretation,
    data: data.map(drug => ({
      ...drug,
      sideEffects: typeof drug.sideEffects === 'string' ? JSON.parse(drug.sideEffects) : drug.sideEffects,
      alternatives: typeof drug.alternatives === 'string' ? JSON.parse(drug.alternatives) : drug.alternatives
    }))
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Apply error handler middleware (must be last)
app.use(errorHandler);

// Export the serverless handler
module.exports.handler = serverless(app); 