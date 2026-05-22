# API Documentation

## Base URL

All API endpoints are prefixed with `/api`.

```
http://localhost:8000/api
```

## Config

### `GET /config`

Load the current application configuration.

**Response:** `AppConfig` JSON object

### `PUT /config`

Save the application configuration.

**Request Body:** `AppConfig` JSON object

**Response:** `{ "status": "success" }`

### `POST /config/test-llm`

Test an LLM configuration.

**Request Body:**
```json
{
  "config_name": "DeepSeek V3",
  "llm_config": {
    "api_key": "sk-...",
    "base_url": "https://api.deepseek.com/v1",
    "model_name": "deepseek-chat",
    "temperature": 0.7,
    "max_tokens": 8192,
    "timeout": 600,
    "interface_format": "OpenAI"
  }
}
```

### `POST /config/test-embedding`

Test an embedding configuration.

**Request Body:**
```json
{
  "config_name": "OpenAI",
  "embedding_config": {
    "api_key": "sk-...",
    "base_url": "https://api.openai.com/v1",
    "model_name": "text-embedding-ada-002",
    "retrieval_k": 4,
    "interface_format": "OpenAI"
  }
}
```

## Generation

### `POST /generate/architecture`

Generate the novel architecture.

**Request Body:**
```json
{
  "novel_path": "./my_novel",
  "chapter_num": 1,
  "topic": "A space opera about lost colonies",
  "genre": "Sci-Fi",
  "num_chapters": 10,
  "word_number": 3000,
  "user_guidance": "",
  "characters_involved": "",
  "key_items": "",
  "scene_location": "",
  "time_constraint": "",
  "llm_config_name": "DeepSeek V3",
  "embedding_config_name": "OpenAI"
}
```

### `POST /generate/blueprint`

Generate the chapter blueprint.

**Request Body:** Same as `/generate/architecture`

### `POST /generate/prompt`

Build the chapter generation prompt (returns prompt text).

**Request Body:** Same as `/generate/architecture`

**Response:** Prompt text string

### `POST /generate/draft`

Generate a chapter draft.

**Request Body:**
```json
{
  ...same fields as architecture...,
  "custom_prompt": "optional custom prompt text"
}
```

**Response:** Draft text string

### `POST /generate/finalize`

Finalize a chapter and update state files.

**Request Body:** Same as `/generate/architecture`

### `POST /generate/enrich`

Enrich (expand) a short chapter.

**Request Body:**
```json
{
  ...same fields...,
  "chapter_text": "current chapter text"
}
```

**Response:** Enriched text string

### `POST /generate/batch`

Batch generate multiple chapters.

**Request Body:**
```json
{
  ...same fields...,
  "start_chapter": 1,
  "end_chapter": 5,
  "expected_word_count": 3000,
  "min_word_count": 2000,
  "auto_enrich": false
}
```

### `POST /generate/consistency`

Check plot consistency.

**Request Body:**
```json
{
  ...same fields...,
  "chapter_text": "current chapter text"
}
```

**Response:** Consistency report string

## Files

### `GET /files/{name}`

Read a file. Supported names: `architecture`, `blueprint`, `character_state`, `global_summary`, `style`, `knowledge_base`, `plot_arcs`.

**Query Parameters:**
- `novel_path` — Novel directory path

**Response:** File content string

### `PUT /files/{name}`

Write a file.

**Request Body:**
```json
{
  "novel_path": "./my_novel",
  "content": "file content here"
}
```

### `GET /files/chapters/{num}`

Read a specific chapter file.

**Query Parameters:**
- `novel_path` — Novel directory path

## Chapters

### `GET /chapters`

List all chapters for a novel.

**Query Parameters:**
- `novel_path` — Novel directory path

**Response:**
```json
[
  { "number": "1", "title": "Chapter Title", "wordCount": 3000 },
  ...
]
```

## Knowledge

### `POST /knowledge/import`

Import a knowledge file into the vector store.

**Request Body:** `multipart/form-data`
- `file` — Text file to import
- `novel_path` — Novel directory path
- `embedding_config_name` — Embedding config to use

### `DELETE /vectorstore`

Clear the vector store for a novel.

**Query Parameters:**
- `novel_path` — Novel directory path

## Roles

### `GET /roles`

List all role categories.

**Query Parameters:**
- `novel_path` — Novel directory path

**Response:**
```json
[
  {
    "name": "Main Characters",
    "roles": [
      { "name": "Alice", "description": "...", "character_arc": "...", "relationships": "..." }
    ]
  }
]
```

### `POST /roles`

Create or update a role.

**Request Body:**
```json
{
  "novel_path": "./my_novel",
  "category": "Main Characters",
  "role": {
    "name": "Alice",
    "description": "...",
    "character_arc": "...",
    "relationships": "..."
  }
}
```

### `DELETE /roles`

Delete a role.

**Query Parameters:**
- `novel_path` — Novel directory path
- `category` — Category name
- `role_name` — Role name

### `POST /roles/category`

Create a new category.

**Request Body:**
```json
{
  "novel_path": "./my_novel",
  "category": "New Category"
}
```

### `POST /roles/analyze`

Analyze text for characters and auto-create roles.

**Request Body:**
```json
{
  "novel_path": "./my_novel",
  "text": "text to analyze..."
}
```

## WebDAV

### `POST /webdav/test`

Test WebDAV connection.

**Request Body:**
```json
{
  "webdav_config": {
    "enabled": true,
    "url": "https://dav.example.com",
    "username": "user",
    "password": "pass",
    "remote_path": "/novels/",
    "sync_interval": 30
  }
}
```

### `POST /webdav/backup`

Backup config to WebDAV.

**Request Body:** Same as `/webdav/test`

### `POST /webdav/restore`

Restore config from WebDAV.

**Request Body:** Same as `/webdav/test`

## Backend Modules (Python API)

### `backend.llm_adapters`

#### `create_llm_adapter(interface_format, base_url, model_name, api_key, temperature, max_tokens, timeout)`

Factory function returning a `BaseLLMAdapter` subclass.

**Supported formats:** `openai`, `deepseek`, `azure openai`, `azure ai`, `ollama`, `ml studio`, `gemini`, `阿里云百炼`, `火山引擎`, `硅基流动`, `grok`

**Returns:** `BaseLLMAdapter` with `.invoke(prompt: str) -> str`

### `backend.embedding_adapters`

#### `create_embedding_adapter(interface_format, api_key, base_url, model_name)`

Factory function returning a `BaseEmbeddingAdapter` subclass.

**Supported formats:** `openai`, `azure openai`, `ollama`, `ml studio`, `gemini`, `siliconflow`

**Returns:** `BaseEmbeddingAdapter` with:
- `.embed_documents(texts: List[str]) -> List[List[float]]`
- `.embed_query(query: str) -> List[float]`

### `backend.novel_generator`

#### `Novel_architecture_generate(...)`

Generates `Novel_architecture.txt` and `character_state.txt`.

#### `Chapter_blueprint_generate(...)`

Generates `Novel_directory.txt` with per-chapter metadata.

#### `generate_chapter_draft(...)`

Generates `chapter_X.txt` draft.

**Returns:** Draft text string.

#### `finalize_chapter(...)`

Finalizes chapter, updates `global_summary.txt`, `character_state.txt`, and vector store.

#### `enrich_chapter_text(chapter_text, word_number, ...)`

Expands short chapter text.

**Returns:** Enriched text string.

#### `import_knowledge_file(...)`

Imports text file into Chroma vector store.

#### `clear_vector_store(filepath)`

Deletes vector store directory.

**Returns:** `True` if deleted, `False` otherwise.

### `backend.chapter_directory_parser`

#### `parse_chapter_blueprint(blueprint_text: str) -> List[dict]`

Parses chapter blueprint into structured dicts.

#### `get_chapter_info_from_blueprint(blueprint_text, target_chapter_number) -> dict`

Returns dict for specific chapter.

### `backend.consistency_checker`

#### `check_consistency(novel_setting, character_state, global_summary, chapter_text, ...)`

Returns consistency review string from LLM.
