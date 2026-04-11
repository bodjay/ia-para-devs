FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/frontend/package.json ./
RUN npm install
COPY packages/frontend/index.html ./
COPY packages/frontend/vite.config.ts ./
COPY packages/frontend/tsconfig.json ./
COPY packages/frontend/src ./src
COPY packages/frontend/public ./public
ARG REACT_APP_BFF_URL=http://localhost:3001
ENV REACT_APP_BFF_URL=${REACT_APP_BFF_URL}
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
