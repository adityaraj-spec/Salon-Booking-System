# Multi-stage Dockerfile for Node.js production container
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000

COPY --from=builder /app ./

EXPOSE 8000

USER node

CMD ["node", "src/index.js"]
