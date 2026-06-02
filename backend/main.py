"""FastAPI application factory + ASGI entrypoint.

Phase 2 collapsed the previous 1444-line monolith into:

* ``backend.core``      — paths + config store + (future) errors/logging
* ``backend.schemas``   — Pydantic request/response models
* ``backend.services``  — business logic (file I/O, roles, AI prompt assembly)
* ``backend.api``       — thin HTTP routers, one per resource group

This module now only owns: the ``FastAPI`` instance, lifespan, CORS,
default-config bootstrap, and a back-compat re-export surface so historical
imports (``from backend.main import AppConfig`` / ``load_config_file`` / …)
keep working.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import ALL_ROUTERS
from backend.core.config_store import (
    apply_proxy_settings as _apply_proxy_settings,
    config_store,
)
from backend.core.paths import (
    CONFIG_PATH as _CONFIG_PATH,
    DATA_DIR as _DATA_DIR_PATH,
    NOVELS_INDEX_PATH as _NOVELS_INDEX_PATH,
)

# --- Re-exports (back-compat with tests / external imports) -----------------
from backend.schemas.config import (  # noqa: F401
    AppConfig,
    ChooseConfigs,
    EmbeddingConfig,
    KeyConfig,
    LLMConfig,
    ModelConfig,
    OtherParams,
    ProviderConfig,
    ProxySetting,
    TestEmbeddingRequest,
    TestLLMRequest,
    WebDAVConfig,
)
from backend.schemas.novel import (  # noqa: F401
    ChapterInfo,
    FileRequest,
    NovelCreateRequest,
    NovelInfoUpdateRequest,
    NovelMetadata,
    NovelUpdateRequest,
)
from backend.schemas.generation import (  # noqa: F401
    BatchRequest,
    ConsistencyRequest,
    DraftRequest,
    EnrichRequest,
    GenerationRequest,
)
from backend.schemas.role import (  # noqa: F401
    CategoryCreateRequest,
    RoleAnalyzeRequest,
    RoleCategory,
    RoleCreateRequest,
    RoleData,
)
from backend.schemas.ai import AIChatRequest, AIPolishRequest, ChatMessage  # noqa: F401
from backend.schemas.webdav import WebDAVRequest  # noqa: F401
from backend.services.ai_service import build_chat_prompt as _build_chat_prompt  # noqa: F401
from backend.services.generation_service import (  # noqa: F401
    get_embedding_params_from_request as _get_embedding_params_from_request,
    get_llm_params_from_request as _get_llm_params_from_request,
)
from backend.services.novel_service import (  # noqa: F401
    create_novel_dir as _create_novel_dir,
    get_novel_by_id as _get_novel_by_id,
    get_novel_dir,
    get_word_count,
    list_chapters,
    load_novels_index,
    read_novel_file,
    save_novels_index,
    update_novel_word_count as _update_novel_word_count,
    write_novel_file,
)
from backend.services.role_service import load_roles, save_roles  # noqa: F401

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

DATA_DIR = str(_DATA_DIR_PATH)
CONFIG_PATH = str(_CONFIG_PATH)
NOVELS_INDEX_PATH = str(_NOVELS_INDEX_PATH)


def apply_proxy_settings(config: dict) -> None:
    """Compat shim — delegates to ``backend.core.config_store``."""
    _apply_proxy_settings(config)


def load_config_file() -> dict:
    cfg = config_store.load()
    if not cfg.get("providers") and not cfg.get("llm_configs"):
        defaults = AppConfig().model_dump()
        for k, v in defaults.items():
            cfg.setdefault(k, v)
    return cfg


def save_config_file(config: dict) -> None:
    config_store.save(config)


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("AI Novel Generator backend starting...")
    if not os.path.exists(CONFIG_PATH):
        default_cfg = AppConfig()
        default_cfg.other_params.filepath = os.path.join(DATA_DIR, "my_novel")
        save_config_file(default_cfg.model_dump())
        logger.info("Created default config at %s", CONFIG_PATH)
    yield
    logger.info("AI Novel Generator backend shutting down...")


def create_app() -> FastAPI:
    application = FastAPI(
        title="AI Novel Generator API",
        description="REST API for AI-powered novel generation",
        version="2.0.0",
        lifespan=lifespan,
    )

    origins_env = os.getenv("CORS_ORIGINS", "*")
    origins = ["*"] if "*" in origins_env else [o.strip() for o in origins_env.split(",") if o.strip()]
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in ALL_ROUTERS:
        application.include_router(router)
    return application


app = create_app()


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8000"))
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
