#!/bin/sh
set -e

# /app/data es un bind mount (./control-autoelevadores/data). Puede llegar creado por
# root en el host: se ajusta el dueño para que la app (uid 1001) pueda escribir.
DATA_DIR="$(dirname "${DB_PATH:-/app/data/control-autoelevadores.db}")"
mkdir -p "$DATA_DIR" "${UPLOADS_DIR:-/app/data/uploads}"
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs "$DATA_DIR" "${UPLOADS_DIR:-/app/data/uploads}"
  RUN_AS="su-exec nextjs"
else
  RUN_AS=""
fi

# Migraciones idempotentes al arrancar (desactivable con AUTO_MIGRATE=false).
# `npm run db:migrate:prod` sigue disponible para correrlas a mano.
if [ "${AUTO_MIGRATE:-true}" = "true" ]; then
  $RUN_AS node /app/scripts/migrate.js
fi

exec $RUN_AS "$@"
