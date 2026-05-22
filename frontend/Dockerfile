# Frontend Dockerfile for AI Novel Generator
# Multi-stage build optimized for Docker layer caching

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first (cached unless package.json changes)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code (changes frequently)
COPY . .

# Build the app
# Vite will use VITE_API_BASE_URL from the build-arg
ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# Stage 2: Serve with nginx (minimal final image)
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (must match FRONTEND_CONTAINER_PORT in docker-compose.yml)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
