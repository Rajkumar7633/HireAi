## Dockerfile for Express backend (independent build)
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --only=production --legacy-peer-deps

# Copy backend source code
COPY backend/. ./

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

CMD ["node", "server.js"]
