FROM node:20-alpine AS builder
WORKDIR /app/packages/vector-service
COPY packages/vector-service/package.json packages/vector-service/tsconfig.json ./
RUN npm install
COPY packages/vector-service/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/vector-service/package.json ./
COPY --from=builder /app/packages/vector-service/dist ./dist
RUN npm install --omit=dev
CMD ["node", "dist/src/index.js"]
