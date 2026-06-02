"""Config + provider test endpoints."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from backend.core.config_store import config_store
from backend.schemas.config import AppConfig, TestEmbeddingRequest, TestLLMRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["config"])


@router.get("/config", response_model=dict)
async def get_config():
    cfg = config_store.load()
    if not cfg.get("providers") and not cfg.get("llm_configs"):
        defaults = AppConfig().model_dump()
        for k, v in defaults.items():
            cfg.setdefault(k, v)
    return cfg


@router.put("/config")
async def update_config(config: AppConfig):
    config_store.save(config.model_dump())
    return {"status": "success"}


@router.post("/config/test-llm")
async def test_llm(req: TestLLMRequest):
    try:
        from backend.llm_adapters import create_llm_adapter

        adapter = create_llm_adapter(
            interface_format=req.llm_config.interface_format,
            base_url=req.llm_config.base_url,
            model_name=req.llm_config.model_name,
            api_key=req.llm_config.api_key,
            temperature=req.llm_config.temperature,
            max_tokens=req.llm_config.max_tokens,
            timeout=req.llm_config.timeout,
        )
        result = adapter.invoke("Hello, this is a test. Please respond with 'OK'.")
        return {"status": "success", "response": result}
    except Exception as e:
        logger.error("LLM test failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/config/test-embedding")
async def test_embedding(req: TestEmbeddingRequest):
    try:
        from backend.embedding_adapters import create_embedding_adapter

        adapter = create_embedding_adapter(
            interface_format=req.embedding_config.interface_format,
            api_key=req.embedding_config.api_key,
            base_url=req.embedding_config.base_url,
            model_name=req.embedding_config.model_name,
        )
        result = adapter.embed_query("test")
        return {"status": "success", "dimensions": len(result)}
    except Exception as e:
        logger.error("Embedding test failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
