#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "========================================"
echo "AI Novel Generator - Docker Build"
echo "========================================"

# Build backend image
echo ""
echo "Building backend image..."
docker build -t ai-novel-generator/backend:latest -f backend/Dockerfile .

# Build frontend image
echo ""
echo "Building frontend image..."
docker build -t ai-novel-generator/frontend:latest -f frontend/Dockerfile ./frontend

echo ""
echo "========================================"
echo "Build complete!"
echo ""
echo "Images built:"
echo "  ai-novel-generator/backend:latest"
echo "  ai-novel-generator/frontend:latest"
echo ""
echo "To start services:"
echo "  docker compose up -d"
echo ""
echo "To force rebuild (ignore cache):"
echo "  docker compose up --build"
echo "========================================"
