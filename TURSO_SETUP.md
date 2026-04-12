# Turso Database Setup (Permanent SQLite for Production)

Turso is a SQLite-compatible database perfect for Vercel deployments. It's edge-deployed, globally distributed, and has a generous free tier.

## ✅ Prerequisites Installed

- `@libsql/client` - Already installed
- All routes converted to async/await
- Database layer supports both local SQLite and Turso

## Step 1: Create Turso Account & Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create a new database
turso db create amharic-class

# Get the database URL
turso db show amharic-class --url

# Create an auth token
turso db tokens create amharic-class
```

**Save these two values**:
- **Database URL**: `libsql://amharic-class-yourname.turso.io`
- **Auth Token**: `eyJhbGc...` (long string)

## Step 2: Seed the Turso Database

Set environment variables locally and run the seed script:

```bash
# Export Turso credentials (replace with your actual values)
export TURSO_DATABASE_URL="libsql://amharic-class-yourname.turso.io"
export TURSO_AUTH_TOKEN="eyJhbGc...your-actual-token..."

# Run seed script - it will detect Turso and use it
cd /Users/sharmaleycarter/Documents/DakitoDasho/projects/amharic-class-website
npm run seed -w server
```

You should see:
```
📦 Using Turso database
Initializing database...
Syncing lessons...
  Synced 43 lessons
Syncing vocabulary...
  Synced 993 vocabulary entries
Syncing quiz questions...
  Synced 690 quiz questions
Database synced successfully!
```

## Step 3: Configure Vercel Environment Variables

Go to your Vercel project dashboard:

1. Navigate to **Settings** → **Environment Variables**
2. Add these variables for all environments (Production, Preview, Development):

```
TURSO_DATABASE_URL=libsql://amharic-class-yourname.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...your-actual-token...
```

## Step 4: Deploy to Vercel

```bash
git add .
git commit -m "Add permanent Turso database support"
git push
```

Vercel will automatically deploy. Your app will now use the persistent Turso database!

## How It Works

### Automatic Database Selection

The `server/src/db.js` file automatically detects which database to use:

- **Production (Vercel)**: Uses Turso if `TURSO_DATABASE_URL` is set
- **Local Development**: Uses `server/amharic.db` SQLite file

### Database Features

- **Async/Await**: All routes now support async operations
- **Transactions**: Properly handled for both SQLite and Turso
- **Migrations**: Automatic schema creation on first connection
- **Seeding**: Same seed script works for both databases

## Benefits

✅ **Persistent** - Data survives deployments and serverless restarts
✅ **SQLite-compatible** - Minimal code changes from better-sqlite3
✅ **Free tier** - 500 databases, 9GB storage, billions of reads/month
✅ **Fast** - Edge-deployed globally, low latency
✅ **Vercel-friendly** - Designed for serverless environments
✅ **Auto-sync** - Schema stays in sync between local and production

## Local Development

To develop locally with the local SQLite database:

```bash
# Don't set TURSO environment variables
npm run dev -w server
```

To test against Turso locally:

```bash
# Set Turso environment variables
export TURSO_DATABASE_URL="libsql://..."
export TURSO_AUTH_TOKEN="eyJhbGc..."

npm run dev -w server
```

## Troubleshooting

### Seed Script Errors

If you get connection errors during seeding:

1. Verify credentials:
   ```bash
   turso db show amharic-class
   ```

2. Test connection:
   ```bash
   turso db shell amharic-class
   ```

3. List your databases:
   ```bash
   turso db list
   ```

### Vercel Deployment Errors

1. Check environment variables are set in Vercel dashboard
2. Check build logs for database connection errors
3. Verify the database was seeded (run seed script locally first)

### Data Not Persisting

If data isn't persisting across deployments:

1. Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set in Vercel
2. Check that you ran the seed script against Turso (not local SQLite)
3. Look for the "📦 Using Turso database" message in logs

## Turso Dashboard

View your database at: https://turso.tech/app

- Monitor usage and performance
- View database size
- Manage tokens and replicas
- Check connection logs

## Cost

Turso free tier includes:
- 500 databases
- 9 GB total storage
- 1 billion row reads/month
- 25 million row writes/month

This is more than sufficient for the Amharic learning app!
