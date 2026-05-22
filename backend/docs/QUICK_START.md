# Backend Quick Start

## Prerequisites

- Python 3.10+
- pip

## Installation

```bash
pip install -r requirements.txt
```

## Running the API Server

```bash
# Development (with auto-reload)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Production
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

The API will be available at:
- API Base: http://localhost:8000/api
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Using the Backend Independently

```python
from backend.llm_adapters import create_llm_adapter
from backend.novel_generator import (
    Novel_architecture_generate,
    Chapter_blueprint_generate,
    generate_chapter_draft,
    finalize_chapter,
)

# Create an LLM adapter
llm = create_llm_adapter(
    interface_format="OpenAI",
    base_url="https://api.openai.com/v1",
    model_name="gpt-4o",
    api_key="your-api-key",
    temperature=0.7,
    max_tokens=8192,
    timeout=600
)

# Generate architecture
Novel_architecture_generate(
    interface_format="OpenAI",
    api_key="your-api-key",
    base_url="https://api.openai.com/v1",
    llm_model="gpt-4o",
    topic="A space opera about lost colonies",
    genre="Sci-Fi",
    number_of_chapters=10,
    word_number=3000,
    filepath="./my_novel",
    temperature=0.7,
    max_tokens=8192,
    timeout=600
)

# Generate blueprint
Chapter_blueprint_generate(
    interface_format="OpenAI",
    api_key="your-api-key",
    base_url="https://api.openai.com/v1",
    llm_model="gpt-4o",
    filepath="./my_novel",
    number_of_chapters=10,
    temperature=0.7,
    max_tokens=4096,
    timeout=600
)
```

## Running Tests

```bash
python -m pytest tests/ -v
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_HOST` | Server bind host | `0.0.0.0` |
| `APP_PORT` | Server port | `8000` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
