FROM node:20-alpine

WORKDIR /monorepo

# Copy root package files for workspace install
COPY package*.json ./
COPY client/package*.json ./client/

# Install all workspace dependencies
RUN npm ci

# Copy client source code
COPY client ./client

# Build the SvelteKit app
RUN npm run build -w client

WORKDIR /monorepo/client

EXPOSE 3000

# SvelteKit adapter-auto will use adapter-node in production
CMD ["node", "build/index.js"]
