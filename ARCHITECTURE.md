# System Architecture

## Overview

This project is an AI-powered novel generation tool with a modern web-based frontend and a Python-based generation backend.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│           Frontend (React + Vite)       │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Config  │ │ Novel   │ │ Generation│  │
│  │ Panel   │ │ Params  │ │ Panel     │  │
│  └─────────┘ └─────────┘ └──────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Chapters│ │ Files   │ │ Role      │  │
│  │ Tab     │ │ Editor  │ │ Library   │  │
│  └─────────┘ └─────────┘ └──────────┘  │
│  ┌─────────┐                            │
│  │ WebDAV  │                            │
│  │ Panel   │                            │
│  └─────────┘                            │
└─────────────────┬───────────────────────┘
                  │ HTTP REST API
┌─────────────────▼───────────────────────┐
│         Backend (FastAPI)               │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Config  │ │ Generate│ │ Files    │  │
│  │ Router  │ │ Router  │ │ Router   │  │
│  └─────────┘ └─────────┘ └──────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Chapters│ │ Knowledge│ │ Roles    │  │
│  │ Router  │ │ Router   │ │ Router   │  │
│  └─────────┘ └─────────┘ └──────────┘  │
│  ┌─────────┐                            │
│  │ WebDAV  │                            │
│  │ Router  │                            │
│  └─────────┘                            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Generation Engine (Python)         │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ LLM     │ │Embed    │ │ Vector   │  │
│  │Adapters │ │Adapters │ │ Store    │  │
│  └─────────┘ └─────────┘ └──────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │Architec-│ │Blue-    │ │ Chapter  │  │
│  │ture     │ │print    │ │ Draft    │  │
│  └─────────┘ └─────────┘ └──────────┘  │
│  ┌─────────┐ ┌─────────┐               │
│  │Finalize │ │Consistency│              │
│  │         │ │ Checker  │               │
│  └─────────┘ └─────────┘               │
└─────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack
- **React 18** — UI framework with hooks
- **TypeScript** — Type safety
- **Vite** — Fast build tool and dev server
- **Tailwind CSS v4** — Utility-first styling
- **Zustand** — Lightweight state management
- **Axios** — HTTP client

### State Management
Three Zustand stores manage application state:

1. **Config Store** — LLM/embedding configs, novel parameters, proxy, WebDAV
2. **Novel Store** — Novel path, chapter list, current chapter content, roles
3. **Generation Store** — Async task tracking (architecture, draft, batch, etc.)

### Component Structure
- **App.tsx** — Root with tab navigation
- **ConfigPanel** — LLM/embedding config management
- **NovelParams** — Novel metadata and parameters
- **GenerationPanel** — 4-step generation + batch + actions
- **ChaptersTab** — Chapter browser
- **FileEditor** — Text file editor for novel files
- **RoleLibrary** — 3-pane character management
- **WebDAVPanel** — Remote sync configuration

## Backend Architecture

### API Layer (FastAPI)
- RESTful endpoints prefixed with `/api`
- CORS middleware for frontend communication
- Pydantic models for request/validation
- Automatic Swagger UI at `/docs`

### Adapter Layer
- **LLM Adapters** — Unified interface for 10+ providers
- **Embedding Adapters** — Unified interface for 6+ providers
- Factory pattern for runtime adapter creation

### Generation Pipeline
1. **Architecture** — Generates worldbuilding document
2. **Blueprint** — Generates per-chapter metadata
3. **Chapter Draft** — Assembles context, generates text
4. **Finalization** — Updates summaries, character state, vector store

### Storage
- **File System** — Novel text files (chapters, summaries, etc.)
- **ChromaDB** — Vector store for semantic knowledge retrieval
- **JSON** — Configuration and role library

## Data Flow

```
User Input → Frontend Component → Zustand Store → Axios → FastAPI
                                                    ↓
File System ← Generation Engine ← Adapter Factory ← Business Logic
     ↑                                              ↓
     └────────── Response JSON ←────────────────────┘
```

## Communication

The frontend and backend communicate via HTTP REST API:
- Base URL: `http://localhost:8000/api`
- CORS enabled for development
- All requests use JSON (except file uploads)

## Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for Docker Compose and manual deployment instructions.
