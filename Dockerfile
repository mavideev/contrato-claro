# syntax=docker/dockerfile:1
# Targets:
#   dev    → desarrollo local con hot reload (docker-compose.yml)
#   runner → imagen de producción (Render), salida standalone de Next.js

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat \
 && npm install -g pnpm@11.13.0
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

FROM deps AS builder
COPY . .
RUN pnpm build
# Migraciones en un solo archivo JS: el runner las corre al arrancar, antes del servidor.
RUN pnpm exec esbuild scripts/migrate.ts --bundle --platform=node --format=esm --outfile=dist/migrate.mjs

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/dist/migrate.mjs ./migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/db/migrations ./db/migrations
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "node migrate.mjs && node server.js"]
