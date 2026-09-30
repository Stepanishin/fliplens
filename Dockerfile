# FlipLens: one service. The API (Fastify, run with tsx) also serves the built PWA from apps/web/dist.
FROM node:22-slim

RUN npm install -g pnpm@9.15.4
WORKDIR /app

# Install dependencies first so this layer is cached while only source files change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/recognition/package.json packages/recognition/
COPY packages/sources/package.json packages/sources/
COPY eval/package.json eval/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @fliplens/web build

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    TRUST_PROXY=1
EXPOSE 8080

# Migrations run at startup. Environment comes from the platform (no .env file in the image).
WORKDIR /app/apps/api
USER node
CMD ["node_modules/.bin/tsx", "src/server.ts"]
