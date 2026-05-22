# AI Novel Generator

AI-powered novel generation tool with a structured pipeline: worldbuilding → chapter blueprinting → draft generation → finalization.

## Features

- **Multi-Provider LLM Support**: OpenAI, DeepSeek, Gemini, Azure, Ollama, LM Studio, Volcano Engine, SiliconFlow, Grok
- **4-Step Generation Pipeline**: Architecture → Blueprint → Draft → Finalize
- **Vector Store Memory**: ChromaDB for semantic knowledge across chapters
- **Role Library**: Character management with categories and attributes
- **Batch Generation**: Generate multiple chapters automatically
- **Consistency Checking**: LLM-based plot consistency review
- **WebDAV Sync**: Backup and restore configurations
- **Modern Web UI**: React + Vite SPA replacing legacy customtkinter GUI

## Quick Start

### Docker Compose (Recommended)

```bash
# Clone and enter the project
git clone <repo-url>
cd AI_NovelGenerator_remix_PK

# Start all services
docker compose up --build

# Or run in background
docker compose up --build -d
```

Access:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

### Manual Setup

**Backend:**
```bash
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
AI_NovelGenerator_remix_PK/
├── frontend/              # React + Vite SPA
│   ├── docs/              # Frontend documentation
│   ├── scripts/           # Build scripts
│   ├── src/               # Source code
│   ├── .env               # Frontend environment
│   ├── .env.example       # Frontend env template
│   └── README.md
├── backend/               # FastAPI + Generation Engine
│   ├── docs/              # Backend documentation
│   ├── scripts/           # Start scripts
│   ├── novel_generator/   # Core pipeline
│   ├── main.py            # FastAPI entry
│   ├── .env               # Backend environment
│   ├── .env.example       # Backend env template
│   └── README.md
├── docs/                  # Project documentation
│   ├── API.md             # API reference
│   └── DEPLOYMENT.md      # Deployment guide
├── scripts/               # Project-wide scripts
├── docker-compose.yml     # Docker orchestration
├── .dockerignore          # Docker ignore rules
├── README.md              # This file
├── ARCHITECTURE.md        # System architecture
├── QUICK_START.md         # Detailed quick start
└── requirements.txt       # Python dependencies
```

## Documentation

- [System Architecture](ARCHITECTURE.md)
- [Quick Start Guide](QUICK_START.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Frontend Docs](frontend/docs/)
- [Backend Docs](backend/docs/)

## Environment Configuration

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_HOST` | Server bind host | `0.0.0.0` |
| `APP_PORT` | Server port | `8000` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `DATA_DIR` | Data directory | `./data` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |
| `VITE_DEBUG` | Debug logging | `false` |

## License

GNU Affero General Public License v3
