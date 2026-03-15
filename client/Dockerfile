FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the SvelteKit app
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

EXPOSE 3000

# SvelteKit adapter-auto will use adapter-node in production
CMD ["node", "build"]
