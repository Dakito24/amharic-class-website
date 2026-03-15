FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (need all for seed script)
RUN npm ci

# Copy server code and data
COPY src ./src
COPY data ./data
COPY docker-entrypoint.sh ./

# Create data directory for persistent database
RUN mkdir -p /app/data && \
    chmod +x docker-entrypoint.sh

EXPOSE 3001

CMD ["./docker-entrypoint.sh"]
