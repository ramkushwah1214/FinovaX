# Stage 1: Build React/Vite application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies using package-lock.json
COPY package*.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Production Nginx runtime
FROM nginx:1.27-alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port 80
EXPOSE 80

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

