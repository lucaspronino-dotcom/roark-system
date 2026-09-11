FROM node:24-bookworm

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm ci

COPY . .
RUN npm run db:generate -w @roark/api

EXPOSE 3000 5173

CMD ["npm", "run", "dev:web"]
