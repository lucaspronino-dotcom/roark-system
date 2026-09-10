FROM node:24-bookworm AS web-build

WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/
RUN npm ci

COPY . .
ARG VITE_API_URL=https://app.roark.uno/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w @roark/web

FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
