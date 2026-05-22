#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Installing dependencies..."
npm install

echo "Building for production..."
npm run build

echo "Build complete. Output: dist/"
