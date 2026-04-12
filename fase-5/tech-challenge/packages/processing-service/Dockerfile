FROM node:20-alpine AS builder
WORKDIR /app/packages/processing-service
COPY packages/processing-service/package.json packages/processing-service/tsconfig.json ./
RUN npm install
COPY packages/processing-service/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/processing-service/package.json ./
COPY --from=builder /app/packages/processing-service/dist ./dist
RUN npm install --omit=dev
CMD ["node", "dist/src/index.js"]
