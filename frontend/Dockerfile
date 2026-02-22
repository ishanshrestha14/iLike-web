# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:lts-alpine AS builder

WORKDIR /app

# VITE_API_BASE_URL is baked into the JS bundle at build time.
# nginx proxies /api → backend:5000, so the default "/api" works
# without exposing the backend port to the host.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
