# Deterministic build for Railway (auto-detected over Nixpacks).
FROM node:22-slim

WORKDIR /app

# p7zip: history backfill archives · build tools: better-sqlite3 fallback compile
RUN apt-get update \
  && apt-get install -y --no-install-recommends p7zip-full ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# railway.json's startCommand overrides this, but keep a sane default
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
