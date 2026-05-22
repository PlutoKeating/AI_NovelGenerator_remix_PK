# Frontend Architecture

## Overview

The frontend follows a component-based architecture with centralized state management via Zustand. It communicates with the backend via a RESTful API.

## State Management

### Config Store (`stores/configStore.ts`)

Manages application configuration including:
- LLM configurations (multiple providers)
- Embedding configurations
- Novel parameters (topic, genre, chapters, etc.)
- Stage-specific LLM selection (choose_configs)
- Proxy settings
- WebDAV configuration

**Key methods:**
- `loadConfig()` — Fetch config from backend
- `saveConfig()` — Persist config to backend
- `updateOtherParams(patch)` — Update novel parameters
- `addLLMConfig(name, cfg)` / `removeLLMConfig(name)`
- `addEmbeddingConfig(name, cfg)` / `removeEmbeddingConfig(name)`

### Novel Store (`stores/novelStore.ts`)

Manages novel-specific state:
- Novel save path
- Chapter list with metadata
- Current chapter number and content
- Role library categories

**Key methods:**
- `refreshChapters()` — Load chapter list from backend
- `loadChapter(num)` — Load specific chapter content
- `saveChapter(num, content)` — Save chapter content
- `loadRoles()` — Load role library categories

### Generation Store (`stores/generationStore.ts`)

Tracks async generation tasks:
- Task type, status, message
- Running / success / error states

## Component Hierarchy

```
App.tsx
├── Tabs
│   ├── GenerationPanel
│   │   ├── Step buttons (1-4 + Batch)
│   │   ├── Chapter editor (Textarea)
│   │   ├── Action buttons (Save, Consistency, Import, Clear)
│   │   ├── Log panel
│   │   └── Dialogs (Prompt edit, Batch config)
│   ├── ConfigPanel
│   │   ├── LLM config list + add form
│   │   ├── Embedding config list + add form
│   │   ├── Stage LLM selection
│   │   └── Proxy settings
│   ├── NovelParams
│   │   ├── Topic, Genre, Path inputs
│   │   ├── Chapter/word count inputs
│   │   ├── Characters, items, location inputs
│   │   └── Role import dialog
│   ├── ChaptersTab
│   │   └── Chapter list (selectable)
│   ├── FileEditor
│   │   ├── File selector
│   │   └── Text editor
│   ├── RoleLibrary
│   │   ├── Category list
│   │   ├── Role list
│   │   ├── Role detail / edit
│   │   └── Analyze dialog
│   └── WebDAVPanel
│       ├── Enable toggle + form fields
│       └── Test / Backup / Restore buttons
└── ToastProvider
```

## API Client

The `lib/api.ts` module exports a pre-configured Axios instance:

```typescript
import api from "./lib/api";

// GET
const res = await api.get("/config");

// POST
const res = await api.post("/generate/architecture", body);

// PUT
await api.put("/config", config);

// DELETE
await api.delete("/vectorstore", { params: { novel_path } });
```

Base URL: `http://localhost:8000/api`

## Data Flow

```
User Action → Component → Store Action → API Call → Backend
     ↑                                              ↓
     └────────── State Update ←─────────────────────┘
```

## Styling

- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Dark mode via `prefers-color-scheme: dark`
- Custom color tokens via CSS variables
- No external UI framework — all components are custom-built
