#!/bin/bash
set -e

BRANCH=$1

if [ -z "$BRANCH" ]; then
  echo "Usage: ./deploy-demo.sh <branch-name>"
  exit 1
fi

cd /home/harboostuser/tea-collection-management-system
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

docker compose -f source-code/deploy/docker-compose.demo.yml --env-file source-code/deploy/.env.demo up -d --build

echo "✅ Demo updated to branch '$BRANCH' — live at http://harboost.duckdns.org:8010"
