FROM node:20-alpine AS builder
WORKDIR /app/packages/architecture-analysis-agent
COPY packages/architecture-analysis-agent/package.json packages/architecture-analysis-agent/tsconfig.json ./
RUN npm install
COPY packages/architecture-analysis-agent/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/architecture-analysis-agent/package.json ./
COPY --from=builder /app/packages/architecture-analysis-agent/dist ./dist
RUN npm install --omit=dev
EXPOSE 3004
CMD ["node", "dist/server.js"]
