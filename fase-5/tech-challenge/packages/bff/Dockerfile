FROM node:20-alpine AS builder
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/bff/package.json packages/bff/tsconfig.json ./packages/bff/
WORKDIR /app/packages/bff
RUN npm install
COPY packages/bff/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/bff/package.json ./
COPY --from=builder /app/packages/bff/dist ./dist
RUN npm install --omit=dev
EXPOSE 3001
CMD ["node", "dist/server.js"]
