# Frontend Quick Start

## Prerequisites

- Node.js 18+ (tested with v22.12.0)
- npm 10+
- Backend server running on `http://localhost:8000`

## Installation

```bash
cd frontend
npm install
```

## Development

```bash
# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` to set your backend API URL if different from default.

## First-Time Setup

1. Open the app in your browser (default: http://localhost:5173)
2. Go to the **Config** tab
3. Add at least one LLM configuration (API key, base URL, model name)
4. Add at least one Embedding configuration
5. In **Stage LLM Selection**, choose which model to use for each pipeline stage
6. Go to the **Novel Params** tab
7. Fill in: Topic, Genre, Number of chapters, Word count per chapter, Save path
8. Go to the **Generation** tab
9. Click **Step 1 Architecture** to generate the novel architecture
10. Click **Step 2 Blueprint** to generate the chapter blueprint
11. Click **Step 3 Draft** to generate a chapter draft
12. Edit the draft in the editor, then click **Step 4 Finalize** to finalize

## Building for Production

```bash
npm run build
```

The production build will be in `dist/` and can be served with any static file server.
