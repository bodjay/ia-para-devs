FROM node:20-alpine AS common-builder
WORKDIR /app/packages/common
COPY packages/common/package.json packages/common/tsconfig.json ./
RUN npm install
COPY packages/common/src ./src
RUN npm run build

FROM node:20-alpine AS builder
WORKDIR /app/packages/architecture-analysis-agent
# Pre-populate common into node_modules so npm install doesn't hit the registry
RUN mkdir -p node_modules/@arch-analyzer/common
COPY --from=common-builder /app/packages/common/dist ./node_modules/@arch-analyzer/common/dist
COPY --from=common-builder /app/packages/common/package.json ./node_modules/@arch-analyzer/common/package.json
COPY packages/architecture-analysis-agent/package.json packages/architecture-analysis-agent/tsconfig.json ./
RUN npm install
COPY packages/architecture-analysis-agent/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/architecture-analysis-agent/package.json ./
COPY --from=builder /app/packages/architecture-analysis-agent/dist ./dist
COPY --from=common-builder /app/packages/common/dist ./node_modules/@arch-analyzer/common/dist
COPY --from=common-builder /app/packages/common/package.json ./node_modules/@arch-analyzer/common/package.json
RUN npm install --omit=dev
CMD ["node", "dist/src/index.js"]
