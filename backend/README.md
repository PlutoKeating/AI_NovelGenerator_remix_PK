# AI Novel Generator — Backend

Core generation engine, LLM/embedding adapters, and FastAPI REST API.

## Quick Start

```bash
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: http://localhost:8000/docs

## Files

- `llm_adapters.py` — Factory for LLM adapters (OpenAI, DeepSeek, Gemini, Azure, Ollama, etc.)
- `embedding_adapters.py` — Factory for embedding adapters
- `consistency_checker.py` — LLM-based plot consistency checker
- `chapter_directory_parser.py` — Parses chapter blueprint text into structured dicts
- `prompt_definitions.py` / `prompt_definitions_en.py` — Prompt templates (Chinese / English)
- `utils.py` — File I/O helpers, JSON save, word-count logic
- `main.py` — FastAPI application entry point
- `novel_generator/` — Core generation pipeline

## novel_generator/ Modules

| Module | Purpose |
|--------|---------|
| `architecture.py` | Generates `Novel_architecture.txt` (4-stage pipeline) |
| `blueprint.py` | Generates `Novel_directory.txt` (chapter blueprint) |
| `chapter.py` | Builds prompts and generates `chapter_X.txt` drafts |
| `finalization.py` | Updates summaries, character state, vector store |
| `knowledge.py` | Imports knowledge files into ChromaDB |
| `vectorstore_utils.py` | ChromaDB init, load, update, search, clear |
| `common.py` | Retry logic, markdown cleanup, debug logging |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Quick Start](docs/QUICK_START.md)
- [API Docs](docs/README.md)
