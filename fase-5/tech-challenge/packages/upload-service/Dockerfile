FROM node:20-alpine AS builder
WORKDIR /app/packages/upload-service
COPY packages/upload-service/package.json packages/upload-service/tsconfig.json ./
RUN npm install
COPY packages/upload-service/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/upload-service/package.json ./
COPY --from=builder /app/packages/upload-service/dist ./dist
RUN npm install --omit=dev
RUN mkdir -p /app/uploads
EXPOSE 3002
CMD ["node", "dist/src/server.js"]
