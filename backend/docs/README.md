# Backend Documentation

## Overview

The backend is the core AI novel generation engine. It provides LLM/embedding adapters, a structured generation pipeline, vector store management, and a FastAPI-based REST API for the frontend.

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.10+ | Runtime |
| FastAPI | latest | Web framework |
| Uvicorn | latest | ASGI server |
| LangChain | 0.3.27 | LLM orchestration |
| ChromaDB | 1.0.20 | Vector database |
| OpenAI SDK | 1.106.1 | API client |

## Project Structure

```
backend/
├── docs/                      # Backend documentation
├── scripts/                   # Utility scripts
├── novel_generator/           # Core generation pipeline
│   ├── __init__.py
│   ├── architecture.py        # Step 1: Novel architecture
│   ├── blueprint.py           # Step 2: Chapter blueprint
│   ├── chapter.py             # Step 3: Chapter draft
│   ├── finalization.py        # Step 4: Finalization
│   ├── knowledge.py           # Knowledge base import
│   ├── vectorstore_utils.py   # ChromaDB operations
│   └── common.py              # Retry, cleanup, logging
├── llm_adapters.py            # LLM adapter factory
├── embedding_adapters.py      # Embedding adapter factory
├── consistency_checker.py     # Plot consistency check
├── chapter_directory_parser.py # Blueprint parser
├── prompt_definitions.py      # Chinese prompts
├── prompt_definitions_en.py   # English prompts
├── utils.py                   # File I/O helpers
├── main.py                    # FastAPI entry point
└── README.md
```

## API Endpoints

### Config
- `GET /api/config` — Load configuration
- `PUT /api/config` — Save configuration
- `POST /api/config/test-llm` — Test LLM connection
- `POST /api/config/test-embedding` — Test embedding connection

### Generation
- `POST /api/generate/architecture` — Generate novel architecture
- `POST /api/generate/blueprint` — Generate chapter blueprint
- `POST /api/generate/prompt` — Build chapter prompt
- `POST /api/generate/draft` — Generate chapter draft
- `POST /api/generate/finalize` — Finalize chapter
- `POST /api/generate/enrich` — Enrich chapter text
- `POST /api/generate/batch` — Batch generate chapters
- `POST /api/generate/consistency` — Check consistency

### Files
- `GET /api/files/{name}` — Read file content
- `PUT /api/files/{name}` — Write file content

### Chapters
- `GET /api/chapters` — List all chapters

### Knowledge
- `POST /api/knowledge/import` — Import knowledge file
- `DELETE /api/vectorstore` — Clear vector store

### Roles
- `GET /api/roles` — List role categories
- `POST /api/roles` — Create/update role
- `DELETE /api/roles` — Delete role
- `POST /api/roles/category` — Create category
- `POST /api/roles/analyze` — Analyze text for roles

### WebDAV
- `POST /api/webdav/test` — Test connection
- `POST /api/webdav/backup` — Backup to WebDAV
- `POST /api/webdav/restore` — Restore from WebDAV

## Running the Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Run with uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Or with python
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

The API docs will be available at http://localhost:8000/docs (Swagger UI).
