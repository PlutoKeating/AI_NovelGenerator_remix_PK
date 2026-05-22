# Backend Architecture

## Overview

The backend is organized into four layers:

1. **API Layer** — FastAPI endpoints for frontend communication
2. **Adapter Layer** — Unified interfaces for LLM and embedding providers
3. **Generation Pipeline** — 4-step novel generation process
4. **Storage Layer** — File system + ChromaDB vector store

## Adapter Layer

### LLM Adapters (`llm_adapters.py`)

- `BaseLLMAdapter` — Abstract base with `.invoke(prompt) -> str`
- Concrete adapters:
  - `OpenAIAdapter` — OpenAI / compatible APIs
  - `DeepSeekAdapter` — DeepSeek API
  - `GeminiAdapter` — Google Gemini
  - `AzureOpenAIAdapter` — Azure OpenAI Service
  - `AzureAIAdapter` — Azure AI Inference
  - `OllamaAdapter` — Local Ollama
  - `MLStudioAdapter` — LM Studio local
  - `VolcanoEngineAIAdapter` — 火山引擎
  - `SiliconFlowAdapter` — 硅基流动
  - `GrokAdapter` — xAI Grok
- Factory: `create_llm_adapter(interface_format, ...)`

### Embedding Adapters (`embedding_adapters.py`)

- `BaseEmbeddingAdapter` — Abstract base
- Concrete adapters: `OpenAIEmbeddingAdapter`, `AzureOpenAIEmbeddingAdapter`, `OllamaEmbeddingAdapter`, `MLStudioEmbeddingAdapter`, `GeminiEmbeddingAdapter`, `SiliconFlowEmbeddingAdapter`
- Factory: `create_embedding_adapter(interface_format, ...)`

## Generation Pipeline (`novel_generator/`)

### Step 1: Architecture (`architecture.py`)

Generates `Novel_architecture.txt` via 4 sub-steps:
1. Core seed (topic + genre)
2. Character dynamics
3. World building
4. Plot architecture

Supports resumable generation via `partial_architecture.json`.

### Step 2: Blueprint (`blueprint.py`)

Generates `Novel_directory.txt` with per-chapter metadata:
- `chapter_role`, `chapter_purpose`
- `suspense_level`, `foreshadowing`
- `plot_twist_level`, `chapter_summary`

Supports chunked generation for large chapter counts.

### Step 3: Draft (`chapter.py`)

- Assembles context: architecture, blueprint, global summary, character state, previous chapters, vector store knowledge
- Generates draft via LLM
- Saves to `chapter_X.txt`

### Step 4: Finalization (`finalization.py`)

- Updates `global_summary.txt`
- Updates `character_state.txt`
- Inserts chapter text into vector store
- `enrich_chapter_text()` expands short chapters

## Vector Store (`vectorstore_utils.py`)

- Uses `langchain_chroma.Chroma` with custom `LCEmbeddingWrapper`
- `init_vector_store()` — create new store
- `load_vector_store()` — load existing store
- `update_vector_store()` — add new chapter segments
- `get_relevant_context_from_vector_store()` — similarity search
- `clear_vector_store()` — remove store directory

## API Layer (`main.py`)

FastAPI application with CORS middleware. All endpoints prefixed with `/api`.

Request/response models use Pydantic for validation.

## Data Flow

```
Frontend Request
  → FastAPI Router
    → Request Validation (Pydantic)
      → Business Logic
        → Adapter Factory → LLM/Embedding Adapter
          → Generation Pipeline
            → File System / ChromaDB
      ← Response
    ← JSON Response
  ← HTTP Response
```

## External Services

- LLM APIs: OpenAI, DeepSeek, Gemini, Azure OpenAI, Azure AI, Ollama, LM Studio, Volcano Engine, SiliconFlow, Grok
- Embedding APIs: Same providers plus local Ollama
- Vector DB: ChromaDB (local persistent storage)
- Optional: WebDAV for config backup/restore
