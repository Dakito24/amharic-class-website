# Running with Docker Compose

## Prerequisites
- Docker Desktop (includes Docker Compose v2)
- No need to install Node.js or npm

## Start the application

From the project root directory:

```bash
docker compose up -d
```

This will:
1. Build the server container (Express API + SQLite database)
2. Build the client container (SvelteKit frontend)
3. Start an nginx reverse proxy
4. Seed the database with 312 vocab entries and 390 quiz questions

## Access the application

Open your browser to: **http://localhost**

The nginx proxy routes:
- `/` → Frontend (SvelteKit on port 3000)
- `/api/` → Backend (Express on port 3001)

## View logs

```bash
# All services
docker compose logs -f

# Just the server
docker compose logs -f server

# Just the client
docker compose logs -f client
```

## Stop the application

```bash
docker compose down
```

To also remove the database volume:
```bash
docker compose down -v
```

## Rebuild after code changes

```bash
docker compose up -d --build
```

## Development mode (without Docker)

If you want to develop locally instead:

**Terminal 1:**
```bash
npm run dev -w server
```

**Terminal 2:**
```bash
npm run dev -w client
```

Then open http://localhost:5173
