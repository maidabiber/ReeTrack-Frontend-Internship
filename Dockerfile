# syntax=docker/dockerfile:1
# Multi-stage build for the ReeTrack SPA: build with Node 20 (matches CI), serve the static
# dist/ with nginx. The app talks to the backend via same-origin relative paths (/api, /hubs),
# so no build-time API URL is needed — Caddy routes those to the backend at the edge.
#
# Build context: the frontend/ repo root.

# ---- build stage ----------------------------------------------------------
FROM --platform=linux/amd64 node:20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# .env is excluded via .dockerignore so the build uses the relative-path defaults
# (VITE_API_BASE_URL=/api, VITE_HUB_URL=/hubs/notifications).
RUN npm run build

# ---- runtime stage --------------------------------------------------------
FROM --platform=linux/amd64 nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
