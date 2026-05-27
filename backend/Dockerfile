# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init

COPY backend/package*.json ./
# Install only production deps with clean install
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# ─── Stage 2: Production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# dumb-init handles PID 1 signals correctly (SIGTERM, SIGINT)
COPY --from=deps /usr/bin/dumb-init /usr/bin/dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 --ingroup nodejs nodeuser

# Copy only production node_modules
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy backend source
COPY --chown=nodeuser:nodejs backend/. ./

ENV NODE_ENV=production \
    PORT=5001

# Create uploads directory with correct ownership
RUN mkdir -p /app/uploads/resumes /app/uploads/general && \
    chown -R nodeuser:nodejs /app/uploads

USER nodeuser

EXPOSE 5001

# Health check — hits the /health endpoint we added
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5001/health | grep -q '"status":"ok"' || exit 1

# dumb-init properly forwards signals to node process
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
