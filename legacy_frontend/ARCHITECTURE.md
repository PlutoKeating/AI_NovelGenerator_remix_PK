# Frontend Architecture

## Overview

The frontend is built with `customtkinter` and follows a tab-based layout. It communicates with the backend by calling functions from `backend.novel_generator` and `backend.llm_adapters`.

## Key Components

### NovelGeneratorGUI (`ui/main_window.py`)

- Initializes all `tkinter`/`customtkinter` variables from `config.json`.
- Sets up proxy environment variables.
- Creates the tabview and binds all generation handlers as methods.
- Provides English/Chinese mode toggle.

### Generation Handlers (`ui/generation_handlers.py`)

All handlers run in background threads to keep the UI responsive:

- `generate_novel_architecture_ui` → calls `Novel_architecture_generate`
- `generate_chapter_blueprint_ui` → calls `Chapter_blueprint_generate`
- `generate_chapter_draft_ui` → calls `build_chapter_prompt`, shows editable dialog, then `generate_chapter_draft`
- `finalize_chapter_ui` → calls `enrich_chapter_text` (if needed) then `finalize_chapter`
- `generate_batch_ui` → bulk chapter generation dialog & loop
- `do_consistency_check` → calls `check_consistency`
- `import_knowledge_handler` / `clear_vectorstore_handler` → vector store management
- `show_plot_arcs_ui` → displays `plot_arcs.txt`

### Config Tab (`ui/config_tab.py`)

- Supports multiple named LLM configs (add/rename/delete/save).
- Per-stage model selection (architecture, blueprint, draft, finalization, consistency).
- Embedding provider switching.
- Proxy configuration.

## Data Flow

```
User Input → GUI Variables → config_manager (load/save config.json)
                              ↓
                     generation_handlers.py
                              ↓
         backend.novel_generator / backend.llm_adapters
                              ↓
                     Generated text files
```
