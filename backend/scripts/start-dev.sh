#!/bin/bash
set -e

cd "$(dirname "$0")/.."

HOST="${APP_HOST:-0.0.0.0}"
PORT="${APP_PORT:-8000}"

echo "Starting AI Novel Generator backend (dev mode) on $HOST:$PORT..."
exec uvicorn backend.main:app --host "$HOST" --port "$PORT" --reload "$@"
