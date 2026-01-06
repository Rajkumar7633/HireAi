# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Set environment variables for build with default values
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NEXT_PUBLIC_BACKEND_URL=http://localhost:5001

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with legacy peer deps to handle React version conflicts
RUN npm ci --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Create necessary directories if they don't exist
RUN mkdir -p ./components/ui ./hooks 2>/dev/null || true

# Build the application
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]