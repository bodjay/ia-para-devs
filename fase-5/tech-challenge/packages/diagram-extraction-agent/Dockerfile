FROM node:20-alpine AS builder
WORKDIR /app/packages/diagram-extraction-agent
COPY packages/diagram-extraction-agent/package.json packages/diagram-extraction-agent/tsconfig.json ./
RUN npm install
COPY packages/diagram-extraction-agent/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/diagram-extraction-agent/package.json ./
COPY --from=builder /app/packages/diagram-extraction-agent/dist ./dist
RUN npm install --omit=dev
EXPOSE 3003
CMD ["node", "dist/src/server.js"]
