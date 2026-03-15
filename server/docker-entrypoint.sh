#!/bin/sh
set -e

# Check if database exists, if not seed it
if [ ! -f "${DB_PATH:-/app/data/amharic.db}" ]; then
  echo "Database not found, seeding..."
  npm run seed
else
  echo "Database found, skipping seed"
fi

# Start the server
exec node src/index.js
