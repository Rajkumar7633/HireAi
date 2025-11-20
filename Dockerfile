# Multi-stage Dockerfile for Next.js app
FROM node:20-alpine AS builder
WORKDIR /app

# Reuse local node_modules to avoid hitting npm registry during docker build.
# Assumes you ran `npm install` on the host before building.
COPY package*.json ./
COPY node_modules ./node_modules
COPY . .

# Provide safe default env vars for build-time so Next.js API routes that
# expect JWT_SECRET and MONGODB_URI don't fail during `npm run build`.
# These can be overridden at runtime in ECS / docker-compose.
ENV JWT_SECRET=dummy-docker-build-secret \
    MONGODB_URI=mongodb://localhost:27017/dummy-docker-build-db

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next.js uses this at runtime
ENV PORT=3000

# Only copy what we need to run
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

RUN npm install --omit=dev

EXPOSE 3000
CMD ["npm", "start"]
