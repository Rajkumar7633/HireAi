# Dockerfile for Express backend
FROM node:20-alpine
WORKDIR /app

# Reuse dependencies from host node_modules (monorepo style).
# Assumes root `npm install` has already been run on the host.
COPY package*.json ./
COPY node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001
CMD ["node", "backend/server.js"]
