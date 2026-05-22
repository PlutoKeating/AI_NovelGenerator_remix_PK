# Quick Start Guide

## Prerequisites

- Docker & Docker Compose (recommended)
- Or: Python 3.10+ and Node.js 18+

## Docker Compose (Fastest)

```bash
# Build and start everything
docker compose up --build

# Access the application
# Frontend: http://localhost
# API Docs: http://localhost:8000/docs
```

## Manual Setup

### 1. Backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# Configure backend environment
cp backend/.env.example backend/.env
# Edit backend/.env if needed

# Start the API server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at http://localhost:8000

### 2. Frontend

```bash
# In a new terminal
cd frontend

# Install Node dependencies
npm install

# Configure frontend environment
cp .env.example .env
# Edit .env if your backend is not on localhost:8000

# Start dev server
npm run dev
```

The frontend will be available at http://localhost:5173

## First-Time Configuration

1. Open the frontend in your browser
2. Go to the **Config** tab
3. Add at least one LLM configuration:
   - Name: e.g., "DeepSeek V3"
   - API Key: your API key
   - Base URL: e.g., `https://api.deepseek.com/v1`
   - Model: e.g., `deepseek-chat`
4. Add at least one Embedding configuration
5. In **Stage LLM Selection**, choose models for each pipeline stage
6. Go to **Novel Params** tab
7. Fill in:
   - Topic: your novel idea
   - Genre: e.g., "Sci-Fi", "Fantasy"
   - Chapters: number of chapters
   - Words/Chapter: target word count
   - Save Path: where to save files
8. Go to **Generation** tab
9. Click **Step 1 Architecture** → wait for completion
10. Click **Step 2 Blueprint** → wait for completion
11. Click **Step 3 Draft** → edit the prompt if needed, confirm
12. Edit the draft in the editor
13. Click **Step 4 Finalize** → chapter is saved and state updated

## Useful Commands

```bash
# Run tests
python -m pytest tests/ -v

# Build frontend for production
cd frontend && npm run build

# Preview production build
cd frontend && npm run preview

# View backend logs (Docker)
docker compose logs -f backend

# Restart services
docker compose restart
```

## Troubleshooting

### Backend won't start
- Check Python version: `python --version` (need 3.10+)
- Check if port 8000 is in use: `lsof -i :8000`
- Install missing dependencies: `pip install -r requirements.txt`

### Frontend won't connect to backend
- Verify backend is running: `curl http://localhost:8000/api/health`
- Check `VITE_API_BASE_URL` in `frontend/.env`
- Check `CORS_ORIGINS` in `backend/.env`

### Docker issues
- Ensure Docker daemon is running
- Check port conflicts: `docker ps`
- Rebuild: `docker compose up --build`
