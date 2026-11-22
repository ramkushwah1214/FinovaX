# Stage 1: Build TypeScript application
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for tsc)
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy TypeScript source code
COPY src ./src

# Compile TypeScript to dist/
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000

# Install production-only dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Run as unprivileged non-root node user
USER node

# Internal communication port
EXPOSE 5000

# Container healthcheck validating Express and MongoDB status
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

# Execute production entry point
CMD ["node", "dist/index.js"]

