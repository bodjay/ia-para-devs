FROM node:20-alpine AS common-builder
WORKDIR /app/packages/common
COPY packages/common/package.json packages/common/tsconfig.json ./
RUN npm install
COPY packages/common/src ./src
RUN npm run build

FROM node:20-alpine AS builder
WORKDIR /app/packages/orchestrator-agent
# Pre-populate common into node_modules so npm install doesn't hit the registry
RUN mkdir -p node_modules/@arch-analyzer/common
COPY --from=common-builder /app/packages/common/dist ./node_modules/@arch-analyzer/common/dist
COPY --from=common-builder /app/packages/common/package.json ./node_modules/@arch-analyzer/common/package.json
COPY packages/orchestrator-agent/package.json packages/orchestrator-agent/tsconfig.json ./
RUN npm install
COPY packages/orchestrator-agent/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/orchestrator-agent/package.json ./
COPY --from=builder /app/packages/orchestrator-agent/dist ./dist
COPY --from=common-builder /app/packages/common/dist ./node_modules/@arch-analyzer/common/dist
COPY --from=common-builder /app/packages/common/package.json ./node_modules/@arch-analyzer/common/package.json
RUN npm install --omit=dev
EXPOSE 3005
CMD ["node", "dist/src/server.js"]
