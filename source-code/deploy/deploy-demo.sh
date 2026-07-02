#!/bin/bash
set -e

BRANCH=$1

if [ -z "$BRANCH" ]; then
  echo "Usage: ./deploy-demo.sh <branch-name>"
  exit 1
fi

cd /tea-collection-management-system
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

docker compose -f deploy/docker-compose.demo.yml --env-file deploy/.env.demo up -d --build

echo "✅ Demo updated to branch '$BRANCH' — live at http://tea-cms.duckdns.org:8010"