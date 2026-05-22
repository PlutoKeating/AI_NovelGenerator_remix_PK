# Backend Architecture

## Overview

The backend is organized into:

1. **Adapters** — Unified interfaces for LLM and embedding providers.
2. **Generation Pipeline** — 4-step novel generation process.
3. **Vector Store** — ChromaDB for semantic memory across chapters.
4. **Utilities** — Common helpers and prompt definitions.

## Adapter Layer

### LLM Adapters (`llm_adapters.py`)

- `BaseLLMAdapter` — Abstract base with `.invoke(prompt)`.
- Concrete adapters: `OpenAIAdapter`, `DeepSeekAdapter`, `GeminiAdapter`, `AzureOpenAIAdapter`, `AzureAIAdapter`, `OllamaAdapter`, `MLStudioAdapter`, `VolcanoEngineAIAdapter`, `SiliconFlowAdapter`, `GrokAdapter`.
- Factory: `create_llm_adapter(interface_format, ...)`.

### Embedding Adapters (`embedding_adapters.py`)

- `BaseEmbeddingAdapter` — Abstract base with `.embed_documents()` / `.embed_query()`.
- Concrete adapters: `OpenAIEmbeddingAdapter`, `AzureOpenAIEmbeddingAdapter`, `OllamaEmbeddingAdapter`, `MLStudioEmbeddingAdapter`, `GeminiEmbeddingAdapter`, `SiliconFlowEmbeddingAdapter`.
- Factory: `create_embedding_adapter(interface_format, ...)`.

## Generation Pipeline (`novel_generator/`)

### Step 1: Architecture (`architecture.py`)

Generates `Novel_architecture.txt` via 4 sub-steps:
1. Core seed
2. Character dynamics
3. World building
4. Plot architecture

Supports resumable generation via `partial_architecture.json`.

### Step 2: Blueprint (`blueprint.py`)

Generates `Novel_directory.txt` with per-chapter metadata:
- chapter_role, chapter_purpose, suspense_level, foreshadowing, plot_twist_level, chapter_summary

Supports chunked generation for large chapter counts.

### Step 3: Draft (`chapter.py`)

- Assembles context: architecture, blueprint, global summary, character state, previous chapters, vector store knowledge.
- Generates draft via LLM.
- Saves to `chapter_X.txt`.

### Step 4: Finalization (`finalization.py`)

- Updates `global_summary.txt`.
- Updates `character_state.txt`.
- Inserts chapter text into vector store.
- `enrich_chapter_text()` expands short chapters.

## Vector Store (`vectorstore_utils.py`)

- Uses `langchain_chroma.Chroma` with a custom `LCEmbeddingWrapper`.
- `init_vector_store()` — create new store.
- `load_vector_store()` — load existing store.
- `update_vector_store()` — add new chapter segments.
- `get_relevant_context_from_vector_store()` — similarity search.
- `clear_vector_store()` — remove store directory.

## Prompt Definitions

- `prompt_definitions.py` — Chinese prompts.
- `prompt_definitions_en.py` — English prompts.
- Dynamically swapped at runtime via `config_manager.IS_ENGLISH`.

## Data Flow

```
architecture.py ──► prompt_definitions + llm_adapters
blueprint.py    ──► prompt_definitions + llm_adapters
chapter.py      ──► prompt_definitions + llm_adapters + embedding_adapters + vectorstore_utils + chapter_directory_parser
finalization.py ──► prompt_definitions + llm_adapters + embedding_adapters + vectorstore_utils
knowledge.py    ──► embedding_adapters + vectorstore_utils
```
