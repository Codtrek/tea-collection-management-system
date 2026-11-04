#!/usr/bin/env bash
# Usage: preview-down.sh <port>   (never touches the port registry)
set -uo pipefail
PORT=${1:?port required}
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "bad port" >&2; exit 1; }
docker rm -f "tea-preview-$PORT" >/dev/null 2>&1
rm -rf "/srv/previews/$PORT" "/etc/nginx/previews.d/$PORT.conf"
sudo nginx -t && sudo systemctl reload nginx
docker rmi "tea-preview-backend:$PORT" >/dev/null 2>&1 || true
