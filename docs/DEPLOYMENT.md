# Deployment Guide

## Docker Compose (Recommended)

The easiest way to run the full stack is with Docker Compose.

### Quick Start

```bash
# Build and start all services (first time or after code changes)
docker compose up --build

# Or run in background
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Using Pre-built Images (Fastest)

If you have already built the images and want to start quickly without rebuilding:

```bash
# Start using existing images (no build)
docker compose up -d

# Or explicitly pull then start
docker compose pull
docker compose up -d
```

### Building Images Separately

```bash
# Build both images
./scripts/docker-build.sh

# Or build individually
docker build -t ai-novel-generator/backend:latest -f backend/Dockerfile .
docker build -t ai-novel-generator/frontend:latest -f frontend/Dockerfile ./frontend

# Then start
docker compose up -d
```

### Forcing a Clean Rebuild

```bash
# Remove old images and rebuild from scratch
docker compose down --rmi all
docker compose up --build

# Or build without cache
docker compose build --no-cache
docker compose up -d
```

## Port Configuration

You have **full control** over which ports are used, both inside and outside the containers.

### Understanding Port Mapping

Docker uses the format `"HOST_PORT:CONTAINER_PORT"`:

| Port Type | Description | Example |
|-----------|-------------|---------|
| **Host Port** | Port on your local machine/browser | `localhost:8000` |
| **Container Port** | Port the app listens on inside Docker | FastAPI listens on `8000` |

### How to Change Ports

#### Method 1: Edit `.env` file (Recommended)

```bash
# Copy the example
cp .env.example .env

# Edit the ports
BACKEND_HOST_PORT=8898        # Access backend at localhost:8898
FRONTEND_HOST_PORT=8080       # Access frontend at localhost:8080
```

Then restart:
```bash
docker compose up -d
```

#### Method 2: Environment variables (One-time)

```bash
BACKEND_HOST_PORT=8898 FRONTEND_HOST_PORT=8080 docker compose up -d
```

#### Method 3: Edit `docker-compose.yml` directly

```yaml
ports:
  - "8898:8000"   # Host:8898 -> Container:8000
```

### Common Port Change Scenarios

| Scenario | `.env` Settings | Access URLs |
|----------|----------------|-------------|
| **Default** | `BACKEND_HOST_PORT=8000`<br>`FRONTEND_HOST_PORT=80` | Frontend: http://localhost<br>API: http://localhost:8000 |
| **Port 80 in use** | `FRONTEND_HOST_PORT=8080` | Frontend: http://localhost:8080 |
| **Port 8000 in use** | `BACKEND_HOST_PORT=8898` | API: http://localhost:8898 |
| **Both changed** | `BACKEND_HOST_PORT=8898`<br>`FRONTEND_HOST_PORT=8080` | Frontend: http://localhost:8080<br>API: http://localhost:8898 |
| **Multiple instances** | Instance 1: `8000`/`80`<br>Instance 2: `8001`/`81` | Instance 1: :80 / :8000<br>Instance 2: :81 / :8001 |

### Important Rules

1. **Host ports must be unique** — No two services can use the same host port
2. **Container ports must match the app config**:
   - `BACKEND_CONTAINER_PORT` must match `APP_PORT` in `backend/.env`
   - `FRONTEND_CONTAINER_PORT` must match the `listen` port in `frontend/nginx.conf`
3. **When changing backend host port**, update `VITE_API_BASE_URL` in `frontend/.env` for development

## Docker Layer Caching Strategy

This project is optimized for Docker layer caching:

### Backend Caching Layers

| Layer | Cache Condition | Typical Time |
|-------|----------------|--------------|
| System dependencies (gcc, g++, curl) | Always cached after first build | ~30s → 0s |
| Python packages (requirements.txt) | Cached unless requirements.txt changes | ~60s → 0s |
| NLTK data download | Always cached after first build | ~10s → 0s |
| Application code | Rebuilt when code changes | ~5s |

### Frontend Caching Layers

| Layer | Cache Condition | Typical Time |
|-------|----------------|--------------|
| Node.js base image | Pulled once | ~0s |
| npm dependencies (package.json) | Cached unless package.json changes | ~30s → 0s |
| Source code build | Rebuilt when code changes | ~15s |
| nginx runtime | Pulled once | ~0s |

### Best Practices

1. **Don't modify `requirements.txt` or `package.json` unnecessarily** — this triggers the slowest layers to rebuild
2. **Only change application code** — rebuilds are fast (~5-20s)
3. **Use `docker compose up -d`** instead of `--build` when no code changes
4. **Use volume mounts for development** — mount code into containers to avoid rebuilding

## Environment Configuration

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_HOST` | Server bind host inside container | `0.0.0.0` |
| `APP_PORT` | Server port inside container | `8000` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `DATA_DIR` | Data directory | `./data` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL for browser | `http://localhost:8000/api` |
| `VITE_DEBUG` | Enable debug logging | `false` |

### Docker Compose (`.env` in project root)

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_HOST_PORT` | Backend port on host machine | `8000` |
| `BACKEND_CONTAINER_PORT` | Backend port inside container | `8000` |
| `FRONTEND_HOST_PORT` | Frontend port on host machine | `80` |
| `FRONTEND_CONTAINER_PORT` | Frontend port inside container | `80` |

## Manual Deployment

### Backend Only

```bash
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Frontend Only

```bash
cd frontend
npm install
npm run build
# Serve dist/ with any static file server
npx serve dist
```

### Full Stack (Development)

Terminal 1:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2:
```bash
cd frontend
npm run dev
```

## Production Considerations

1. **CORS**: Set `CORS_ORIGINS` to your frontend domain, not `*`
2. **SSL**: Use a reverse proxy (nginx, traefik) for HTTPS
3. **Data Persistence**: Mount a volume for `DATA_DIR`
4. **API Keys**: Never commit `.env` files with real API keys
5. **Image Tags**: Use versioned tags instead of `latest` for reproducible deployments
