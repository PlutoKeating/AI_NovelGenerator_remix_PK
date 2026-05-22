#!/bin/bash
set -e

echo "========================================"
echo "AI Novel Generator - Setup Script"
echo "========================================"

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "Error: Python is not installed"
    exit 1
fi

PYTHON_CMD=$(command -v python3 || command -v python)
echo "Using Python: $PYTHON_CMD"

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
pip install -r requirements.txt

# Setup frontend
echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "========================================"
echo "Setup complete!"
echo ""
echo "To start the backend:"
echo "  uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "To start the frontend (dev):"
echo "  cd frontend && npm run dev"
echo ""
echo "Or use Docker Compose:"
echo "  docker compose up --build"
echo "========================================"
