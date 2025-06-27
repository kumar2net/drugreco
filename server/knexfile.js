const path = require('path');
require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'drugreco_dev',
      user: process.env.DB_USER || 'kumar',
      password: process.env.DB_PASSWORD
    },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  },
  
  production: {
    client: 'pg',
    connection: (process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL) + '?sslmode=require',
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  }
}; 