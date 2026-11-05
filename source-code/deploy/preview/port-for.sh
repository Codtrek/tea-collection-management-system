#!/usr/bin/env bash
# Usage: port-for.sh "<branch-name>"  ->  prints the branch's port
set -euo pipefail
DB=/opt/preview/ports.db; BASE=9000; MAX_PORTS=100
BRANCH=${1:?branch name required}
[[ "$BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]] || { echo "unsupported branch name: $BRANCH" >&2; exit 1; }
sq() { sqlite3 -cmd ".timeout 5000" "$DB" "$@"; }

sq "CREATE TABLE IF NOT EXISTS ports(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);"

ID=$(sq "SELECT id FROM ports WHERE branch='$BRANCH';")
if [ -z "$ID" ]; then
  # insert only when missing, so a repeat push never uses up an id
  sq "INSERT OR IGNORE INTO ports(branch) VALUES('$BRANCH');"
  ID=$(sq "SELECT id FROM ports WHERE branch='$BRANCH';")
fi
[ "$ID" -le "$MAX_PORTS" ] || { echo "port range exhausted" >&2; exit 1; }
echo $((BASE + ID - 1))
