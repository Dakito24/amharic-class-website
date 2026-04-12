# Vercel Deployment Guide

This project is configured to deploy both the frontend (SvelteKit) and backend (Express API) to Vercel.

## Setup

### 1. Install Vercel CLI (optional, for testing)
```bash
npm i -g vercel
```

### 2. Link to Vercel Project
```bash
vercel link
```

### 3. Set Environment Variables in Vercel Dashboard

Go to your Vercel project settings and add:

- `NODE_ENV=production`
- `GOOGLE_APPLICATION_CREDENTIALS` - Upload your GCP credentials JSON as a secret
- Any other environment variables your app needs

### 4. Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Configuration Files

- **`vercel.json`** - Configures both frontend and backend builds
- **`client/svelte.config.js`** - Uses `@sveltejs/adapter-vercel`
- **`api/index.js`** - Serverless function wrapper for Express API
- **`.vercelignore`** - Files to exclude from deployment

## How It Works

1. **Frontend**: SvelteKit app builds with `@sveltejs/adapter-vercel` to `.svelte-kit/vercel/output`
2. **Backend**: Express app is wrapped as a Vercel serverless function at `/api/*`
3. **Database**: SQLite database is initialized on first serverless function call
4. **Static Files**: Audio files in `client/static/audio/` are served automatically

## Important Notes

### Database Persistence
SQLite databases in serverless environments are ephemeral. For production, consider:
- Using Vercel Postgres instead of SQLite
- Or deploy backend to a persistent server (Railway, Render, Fly.io)
- Or use Vercel KV for session data + external DB for persistent storage

### Audio Files
Audio files should be committed to git or uploaded to Vercel Blob Storage for persistence across deployments.

### Build Commands
The build happens in two stages:
1. Client build: `cd client && npm run build`
2. API build: Automatic via Vercel serverless functions

## Troubleshooting

### "No Output Directory" Error
- Ensure `@sveltejs/adapter-vercel` is installed in client
- Check `client/svelte.config.js` uses `adapter-vercel`

### API Routes Not Working
- Ensure all API routes start with `/api/`
- Check `api/index.js` properly imports the Express app
- Verify `server/src/index.js` exports the app

### Database Errors
- Check database is initialized in `initDatabase()`
- Consider using environment-based database (Postgres for production)

## Alternative: Separate Deployments

You can also deploy frontend and backend separately:

### Frontend Only (Vercel)
```bash
cd client
vercel
```

### Backend (Railway/Render/Fly.io)
Deploy the `/server` directory to a Node.js hosting service and update the API proxy in `client/vite.config.js` to point to the deployed backend URL.
