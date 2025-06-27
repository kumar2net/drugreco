# 🚀 Commands to Run After Manual Setup

## After Creating GitHub Repository and Neon Database

### 1. Connect to GitHub Repository
```bash
# Add the GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/agentic-ai-drug-app.git

# Push to GitHub
git push -u origin master
```

### 2. Set up Neon Database
```bash
# Go to server directory
cd server

# Set environment variable (replace with your actual Neon connection string)
export DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# Run migrations on Neon database
NODE_ENV=production npx knex migrate:latest

# Seed Neon database with drug data
NODE_ENV=production npx knex seed:run

# Test connection
NODE_ENV=production node -e "const knex = require('knex'); const config = require('./knexfile.js'); const db = knex(config.production); db.raw('SELECT 1').then(() => { console.log('✅ Neon database connected!'); process.exit(0); }).catch(err => { console.log('❌ Connection failed:', err.message); process.exit(1); });"
```

### 3. Deploy to Netlify with Neon Database
```bash
# Go back to project root
cd ..

# Set DATABASE_URL in Netlify environment variables
netlify env:set DATABASE_URL "your-neon-connection-string-here"

# Deploy to production
netlify deploy --prod
```

### 4. Verify Deployment
```bash
# Test the deployed API
curl https://kumarai.netlify.app/.netlify/functions/api/drugs | head -c 200
```

## 📝 Notes:
- Replace `YOUR_USERNAME` with your actual GitHub username
- Replace the DATABASE_URL with your actual Neon connection string
- The deployment will automatically use your Neon database in production 