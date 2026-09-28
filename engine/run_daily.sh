#!/usr/bin/env bash
# run_daily.sh — scrape diario uy-jobs directo a Postgres.
# Uso: run_daily.sh [env_file]
# Cron: 30 6 * * * /home/ubuntu/projects/uy-jobs/engine/run_daily.sh >> /home/ubuntu/backups/logs/uyjobs-scrape.log 2>&1
set -u
ENV_FILE="${1:-/home/ubuntu/.config/uyjobs/production.env}"
ENGINE_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[$(date -Is)] ERROR: DATABASE_URL vacia en $ENV_FILE"
  exit 1
fi
# Dentro de docker el host es glyphium-postgres; en el host es 127.0.0.1.
export DATABASE_URL="${DATABASE_URL/@glyphium-postgres:/@127.0.0.1:}"
echo "[$(date -Is)] inicio scrape diario"
python3 "$ENGINE_DIR/scrape_pg.py" --fuente todas --paginas 8 --detalle 150 --delay 1.2 --proxy-file "$ENGINE_DIR/proxies.txt"
echo "[$(date -Is)] scrape rc=$?"
# recalcula matches y genera notificaciones en la web
if [ -n "${CRON_SECRET:-}" ]; then
  curl -s -X POST http://127.0.0.1:5182/api/internal/rematch \
    -H "Authorization: Bearer $CRON_SECRET" | head -c 300
  echo ""
  echo "[$(date -Is)] rematch rc=$?"
fi
echo "[$(date -Is)] fin"
