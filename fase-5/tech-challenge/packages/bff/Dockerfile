FROM node:20-alpine AS common-builder
WORKDIR /app/packages/common
COPY packages/common/package.json packages/common/tsconfig.json ./
RUN npm install
COPY packages/common/src ./src
RUN npm run build

FROM node:20-alpine AS builder
# Place tsconfig.base.json at /app so bff's tsconfig (extends ../../tsconfig.base.json) resolves correctly
WORKDIR /app
COPY tsconfig.base.json ./

WORKDIR /app/packages/bff
# Pre-populate common into node_modules so npm install doesn't hit the registry
RUN mkdir -p node_modules/@arch-analyzer/common
COPY --from=common-builder /app/packages/common/dist ./node_modules/@arch-analyzer/common/dist
COPY --from=common-builder /app/packages/common/package.json ./node_modules/@arch-analyzer/common/package.json
COPY packages/bff/package.json packages/bff/tsconfig.json ./
RUN npm install
COPY packages/bff/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/bff/package.json ./
COPY --from=builder /app/packages/bff/dist ./dist
COPY --from=common-builder /app/packages/common/dist ./node_modules/@arch-analyzer/common/dist
COPY --from=common-builder /app/packages/common/package.json ./node_modules/@arch-analyzer/common/package.json
RUN npm install --omit=dev
EXPOSE 3001
CMD ["node", "dist/server.js"]
