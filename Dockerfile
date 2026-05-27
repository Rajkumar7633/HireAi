# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --legacy-peer-deps && npm cache clean --force

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─── Stage 3: Production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=deps /usr/bin/dumb-init /usr/bin/dumb-init

ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health 2>/dev/null | grep -q '"status"' || wget -qO- http://localhost:3000/ > /dev/null 2>&1 || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]