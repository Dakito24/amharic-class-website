FROM node:20-alpine

WORKDIR /monorepo

# Copy root package files for workspace install
COPY package*.json ./
COPY server/package*.json ./server/

# Install all workspace dependencies
RUN npm ci

# Copy server source code
COPY server/src ./server/src
COPY server/data ./server/data
COPY server/docker-entrypoint.sh ./server/

# Create data directory and make entrypoint executable
RUN mkdir -p /monorepo/server/db && \
    chmod +x /monorepo/server/docker-entrypoint.sh

WORKDIR /monorepo/server

EXPOSE 3001

CMD ["/monorepo/server/docker-entrypoint.sh"]
