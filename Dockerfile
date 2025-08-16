# Multi-stage Docker build for ProofKit SaaS
# Production-ready configuration with optimization and security

# Stage 1: Base Node.js setup
FROM node:18-alpine AS base
WORKDIR /app

# Install security updates and essential packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S proofkit -u 1001

# Stage 2: Dependencies installation
FROM base AS deps
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shopify-ui/package*.json ./shopify-ui/ 2>/dev/null || true

# Install production dependencies
RUN npm ci --only=production --omit=dev
RUN cd backend && npm ci --only=production --omit=dev

# Stage 3: Build stage
FROM base AS builder
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shopify-ui/package*.json ./shopify-ui/ 2>/dev/null || true

# Install all dependencies (including dev dependencies)
RUN npm ci
RUN cd backend && npm ci

# Copy source code
COPY . .

# Build frontend if exists
RUN if [ -d "shopify-ui" ]; then cd shopify-ui && npm run build 2>/dev/null || echo "No build script found"; fi

# Stage 4: Production runtime
FROM node:18-alpine AS runtime
WORKDIR /app

# Install production dependencies and security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S proofkit -u 1001

# Copy production dependencies
COPY --from=deps --chown=proofkit:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=proofkit:nodejs /app/backend/node_modules ./backend/node_modules

# Copy application code
COPY --from=builder --chown=proofkit:nodejs /app/backend ./backend
COPY --from=builder --chown=proofkit:nodejs /app/package*.json ./
COPY --from=builder --chown=proofkit:nodejs /app/shopify-ui/dist ./public 2>/dev/null || true

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Switch to non-root user
USER proofkit

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/server.js"]