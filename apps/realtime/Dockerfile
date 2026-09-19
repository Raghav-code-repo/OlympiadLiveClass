# ==============================================================================
# Production Dockerfile for Realtime Service (Socket.IO + FFmpeg HLS Worker)
# ==============================================================================
FROM node:20-bookworm-slim AS base

# Install FFmpeg for HLS ladder transcoding & thumbnail generation
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    openssl \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Enable PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root workspace configurations
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/realtime/package.json ./apps/realtime/

# Install production dependencies only
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY apps/realtime/ ./apps/realtime/

# Build shared packages and realtime service
RUN pnpm --filter @repo/shared build && \
    pnpm --filter @repo/db generate && \
    pnpm --filter @repo/db build && \
    pnpm --filter @repo/realtime build

ENV NODE_ENV=production
ENV REALTIME_PORT=4000

EXPOSE 4000

CMD ["node", "apps/realtime/dist/server.js"]
