# AI Novel Generator — Frontend

React 18 + TypeScript + Vite SPA frontend for the AI Novel Generator.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
frontend/
├── docs/              # Documentation
├── scripts/           # Build scripts
├── public/            # Static assets
├── src/
│   ├── components/    # React components
│   ├── stores/        # Zustand state stores
│   ├── lib/           # Utilities & API client
│   ├── types/         # TypeScript types
│   ├── App.tsx        # Root component
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles
├── index.html
├── vite.config.ts
├── package.json
└── README.md
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Quick Start](docs/QUICK_START.md)
- [Component Docs](docs/README.md)

## Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |
