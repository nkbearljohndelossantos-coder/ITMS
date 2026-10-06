# Production Dockerfile for NKB Centralized API Platform
FROM node:20-alpine AS builder

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy client package files and build React bundle
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY . .
RUN npm run build --prefix client

# Final Production Stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/server /app/server
COPY --from=builder /app/client/dist /app/client/dist

EXPOSE 5000

CMD ["node", "server/src/server.js"]
