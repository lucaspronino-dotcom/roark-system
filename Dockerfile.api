FROM node:24-bookworm

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm ci

COPY . .
RUN npm run db:generate -w @roark/api
RUN npm run build -w @roark/api

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
