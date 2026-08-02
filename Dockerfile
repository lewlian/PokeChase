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

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time.
# Railway forwards service variables as build args when matching ARGs exist.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Migrations run in-app when the DB first opens (src/db/index.ts)
CMD ["npm", "run", "start"]
