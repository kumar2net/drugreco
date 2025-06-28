# 🚂 Railway Deployment Guide

## 🚀 Quick Deploy to Railway

### Step 1: Prepare Your Repository
Your repository is now configured for Railway deployment with:
- ✅ `railway.json` - Railway configuration
- ✅ `Procfile` - Process configuration
- ✅ `server/index.js` - Express server (no serverless)
- ✅ Removed Netlify dependencies and configs

### Step 2: Deploy to Railway

1. **Sign up/Login to Railway**
   ```bash
   # Install Railway CLI (optional)
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy from GitHub** (Recommended)
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your `drugreco` repository
   - Railway will auto-detect and deploy!

3. **Or Deploy from CLI**
   ```bash
   railway login
   railway init
   railway up
   ```

### Step 3: Set Up Database

1. **Add PostgreSQL Service**
   - In Railway dashboard, click "New Service"
   - Select "PostgreSQL"
   - Railway auto-creates `DATABASE_URL` environment variable

2. **Run Migrations**
   ```bash
   # From Railway dashboard or CLI
   railway run npm run db:migrate
   railway run npm run db:seed
   ```

### Step 4: Environment Variables

Railway will automatically provide:
- `PORT` - Auto-assigned
- `DATABASE_URL` - Auto-generated for PostgreSQL
- `NODE_ENV=production` - Set automatically

**Optional Variables to Add:**
```
CLIENT_URL=https://your-app.railway.app
```

### Step 5: Custom Domain (Optional)

1. Go to your Railway project
2. Click "Settings" → "Domains"  
3. Add your custom domain
4. Update DNS records as shown

## 🔧 Local Development

### Prerequisites
```bash
# Install all dependencies
npm run install:all

# Set up local database (if using local PostgreSQL)
npm run db:migrate
npm run db:seed
```

### Environment Variables
Create `.env` in the root directory:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/drugreco_dev
NODE_ENV=development
PORT=3001
```

### Run Locally
```bash
# Development server
npm run dev

# Production mode locally
npm run start:prod

# Database operations
npm run db:reset    # Reset and seed database
npm run db:migrate  # Run migrations only
npm run db:seed     # Seed data only
```

## 📁 Project Structure (Post-Railway Migration)

```
drugreco/
├── client/                 # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # Main server file (NEW)
│   ├── db/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── knexfile.js
│   └── package.json
├── railway.json           # Railway config (NEW)
├── Procfile              # Process config (NEW)
├── package.json          # Root config (UPDATED)
└── RAILWAY_DEPLOY.md     # This guide
```

## 🔄 Migration from Netlify

### What Changed:
- ❌ **Removed**: `netlify.toml`, `serverless-http`, Netlify Functions
- ✅ **Added**: `server/index.js`, `railway.json`, Railway configs
- 🔄 **Updated**: Package.json scripts, removed Netlify dependencies

### Benefits of Railway:
- 🚀 **Simpler**: One deployment for full-stack app
- 🔧 **Easier**: No serverless function limitations
- 💾 **Database**: Built-in PostgreSQL with auto-connection
- 🌐 **Domains**: Easy custom domain setup
- 💰 **Cost**: Generous free tier

## 🛠️ Troubleshooting

### Build Issues
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Database Issues
```bash
# Check database connection
railway run npm run db:migrate

# Reset database completely
railway run npm run db:reset
```

### Environment Issues
- Ensure `NODE_ENV=production` in Railway
- Check `DATABASE_URL` is set automatically
- Verify port binding (Railway sets `PORT` automatically)

## 📞 Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Project Issues: Check this repo's Issues tab

---

**🎉 Your app is now Railway-ready! Just push to GitHub and deploy.** 