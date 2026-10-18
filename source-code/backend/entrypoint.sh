#!/bin/sh
set -e

echo "🌱 Running seed..."
npm run seed

echo "🚀 Starting dev server with hot reload..."
exec npm run start:dev