FROM node:20-alpine AS builder
WORKDIR /app/packages/report-service
COPY packages/report-service/package.json packages/report-service/tsconfig.json ./
RUN npm install
COPY packages/report-service/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/report-service/package.json ./
COPY --from=builder /app/packages/report-service/dist ./dist
RUN npm install --omit=dev
CMD ["node", "dist/src/index.js"]
