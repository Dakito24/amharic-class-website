#!/bin/sh
set -e

# Sync content data (safe: uses upserts, never destroys user data)
echo "Syncing content data..."
npm run seed

# Start the server
exec node src/index.js
