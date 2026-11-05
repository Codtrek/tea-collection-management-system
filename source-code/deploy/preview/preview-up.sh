#!/usr/bin/env bash
# Usage: preview-up.sh <port> <image>
# stdin: line 1 = DATABASE_URL, line 2 = JWT_SECRET
set -euo pipefail
PORT=${1:?port required}; IMAGE=${2:?image required}
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "bad port" >&2; exit 1; }
DOMAIN=harboost.duckdns.org
MAX_RUNNING=1
NAME=tea-preview-$PORT
INTERNAL=$((PORT + 10000))
IFS= read -r DATABASE_URL
IFS= read -r JWT_SECRET
export DATABASE_URL JWT_SECRET

# at capacity and this preview isn't running yet: evict the oldest one
if ! docker ps -q --filter "name=^${NAME}\$" | grep -q .; then
  while [ "$(docker ps -q --filter 'name=^tea-preview-' | wc -l)" -ge "$MAX_RUNNING" ]; do
    OLDEST=$(docker ps --filter 'name=^tea-preview-' --format '{{.CreatedAt}}|{{.Names}}' | sort | head -1 | cut -d'|' -f2)
    /opt/preview/preview-down.sh "${OLDEST#tea-preview-}"
  done
fi

docker image inspect "$IMAGE" >/dev/null
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped \
  --memory 256m --memory-swap 512m \
  -p 127.0.0.1:${INTERNAL}:3000 \
  -e NODE_ENV=production -e NODE_OPTIONS=--max-old-space-size=160 \
  -e PORT=3000 -e CORS_ORIGIN="https://${DOMAIN}:${PORT}" \
  -e DATABASE_URL -e JWT_SECRET \
  "$IMAGE" >/dev/null

cat > /etc/nginx/previews.d/${PORT}.conf <<NGINX
server {
  listen ${PORT} ssl;
  server_name ${DOMAIN};
  ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
  root /srv/previews/${PORT};
  index index.html;
  client_max_body_size 20m;
  location /api/ {
    proxy_pass http://127.0.0.1:${INTERNAL}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
  location / { try_files \$uri /index.html; }
}
NGINX
sudo nginx -t && sudo systemctl reload nginx
echo "preview up: https://${DOMAIN}:${PORT}"
