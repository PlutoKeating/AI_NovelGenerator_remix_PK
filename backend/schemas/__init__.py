"""Pydantic schema package — single import surface for the API layer.

Re-exports every request/response model that previously lived inline in
``backend.main``. The API routers import from here; ``backend.main`` re-exports
the same names so legacy test imports (``from backend.main import AppConfig``)
keep working.
"""
from backend.schemas.config import (
    ModelConfig,
    KeyConfig,
    ProviderConfig,
    LLMConfig,
    EmbeddingConfig,
    OtherParams,
    ChooseConfigs,
    ProxySetting,
    WebDAVConfig,
    AppConfig,
    TestLLMRequest,
    TestEmbeddingRequest,
)
from backend.schemas.novel import (
    NovelMetadata,
    NovelCreateRequest,
    NovelUpdateRequest,
    NovelInfoUpdateRequest,
    ChapterInfo,
    FileRequest,
)
from backend.schemas.generation import (
    GenerationRequest,
    DraftRequest,
    EnrichRequest,
    BatchRequest,
    ConsistencyRequest,
)
from backend.schemas.role import (
    RoleData,
    RoleCategory,
    RoleCreateRequest,
    CategoryCreateRequest,
    RoleAnalyzeRequest,
)
from backend.schemas.ai import ChatMessage, AIChatRequest, AIPolishRequest
from backend.schemas.webdav import WebDAVRequest

__all__ = [
    # config
    "ModelConfig", "KeyConfig", "ProviderConfig", "LLMConfig", "EmbeddingConfig",
    "OtherParams", "ChooseConfigs", "ProxySetting", "WebDAVConfig", "AppConfig",
    "TestLLMRequest", "TestEmbeddingRequest",
    # novel
    "NovelMetadata", "NovelCreateRequest", "NovelUpdateRequest",
    "NovelInfoUpdateRequest", "ChapterInfo", "FileRequest",
    # generation
    "GenerationRequest", "DraftRequest", "EnrichRequest", "BatchRequest",
    "ConsistencyRequest",
    # role
    "RoleData", "RoleCategory", "RoleCreateRequest", "CategoryCreateRequest",
    "RoleAnalyzeRequest",
    # ai
    "ChatMessage", "AIChatRequest", "AIPolishRequest",
    # webdav
    "WebDAVRequest",
]
