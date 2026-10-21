# syntax=docker/dockerfile:1
# control-autoelevadores — Next.js 14 standalone + SQLite (better-sqlite3)

# --- deps: dependencias completas (incluye devDependencies para `next build`) ---
FROM node:20-alpine AS deps
# Toolchain solo para compilar better-sqlite3 si no hay binario precompilado para musl.
# Queda en este stage: no llega a la imagen final.
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- deps-prod: solo dependencias de producción (§6.1 del estándar) ---
# El tracer del standalone no siempre copia addons nativos ni paquetes usados solo
# por scripts (better-sqlite3, bcryptjs, drizzle-orm/migrator). Por eso se reemplaza
# el node_modules parcial del standalone por este set completo, sin devDependencies.
FROM node:20-alpine AS deps-prod
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- build ---
FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner: imagen final, sin herramientas de build ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Argentina/Buenos_Aires \
    DB_PATH=/app/data/control-autoelevadores.db \
    UPLOADS_DIR=/app/data/uploads
# su-exec: el entrypoint arranca como root solo para ajustar permisos de ./data
# (bind mount creado por el admin) y luego baja a usuario no privilegiado.
RUN apk add --no-cache su-exec tzdata \
 && addgroup -S -g 1001 nodejs \
 && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deps-prod --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
# Migraciones y scripts de DB (no forman parte del grafo del standalone).
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/scripts ./scripts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
