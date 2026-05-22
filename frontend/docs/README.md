# Frontend Documentation

## Overview

The frontend is a React 18 + TypeScript + Vite SPA that replaces the legacy `customtkinter` GUI. It provides a modern web-based interface for the AI Novel Generator.

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | ~5.6.2 | Type safety |
| Vite | ^6.0.0 | Build tool & dev server |
| Tailwind CSS | ^4.0.0 | Utility-first CSS |
| Zustand | ^4.5.5 | State management |
| Axios | ^1.7.7 | HTTP client |
| Lucide React | ^0.460.0 | Icons |

## Project Structure

```
frontend/
├── docs/                  # Frontend-specific documentation
├── scripts/               # Build & utility scripts
├── public/                # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── ui/            # Reusable UI primitives
│   │   ├── ConfigPanel.tsx
│   │   ├── GenerationPanel.tsx
│   │   ├── NovelParams.tsx
│   │   ├── ChaptersTab.tsx
│   │   ├── FileEditor.tsx
│   │   ├── RoleLibrary.tsx
│   │   └── WebDAVPanel.tsx
│   ├── stores/            # Zustand state stores
│   │   ├── configStore.ts
│   │   ├── novelStore.ts
│   │   └── generationStore.ts
│   ├── lib/               # Utilities & API client
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000/api` |

## UI Components

All UI components in `src/components/ui/` are custom-built lightweight alternatives to shadcn/ui, using Tailwind CSS for styling and Radix UI primitives where needed.

### Available Components

- **Button** — Variants: default, destructive, outline, secondary, ghost, link
- **Input** — Text input with consistent styling
- **Textarea** — Multi-line text input
- **Label** — Form label
- **Select** — Dropdown select with custom trigger
- **Dialog** — Modal dialog with header, title, footer
- **Tabs** — Tab navigation with triggers and content panels
- **Switch** — Toggle switch
- **Checkbox** — Checkbox input
- **ScrollArea** — Scrollable container
- **Toast** — Toast notification system with provider
- **Badge** — Status badge
- **Slider** — Range slider
