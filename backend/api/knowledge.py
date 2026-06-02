"""Knowledge import + vector store admin."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from backend.core.config_store import config_store
from backend.core.paths import DATA_DIR
from backend.services.novel_service import get_novel_dir

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["knowledge"])


@router.post("/knowledge/import")
async def import_knowledge(
    file: UploadFile = File(...),
    novel_path: str = Form(...),
    embedding_config_name: str = Form("default"),
):
    try:
        from backend.novel_generator import import_knowledge_file

        config = config_store.load()
        emb_cfg = (config.get("embedding_configs", {}) or {}).get(embedding_config_name, {})
        text = (await file.read()).decode("utf-8")

        temp_path = Path(DATA_DIR) / "temp_knowledge.txt"
        temp_path.write_text(text, encoding="utf-8")
        try:
            import_knowledge_file(
                embedding_api_key=emb_cfg.get("api_key", ""),
                embedding_url=emb_cfg.get("base_url", ""),
                embedding_interface_format=emb_cfg.get("interface_format", "OpenAI"),
                embedding_model_name=emb_cfg.get("model_name", ""),
                file_path=str(temp_path),
                filepath=get_novel_dir(novel_path),
            )
        finally:
            try:
                os.remove(temp_path)
            except OSError:
                pass
        return {"status": "success", "message": "Knowledge imported"}
    except Exception as e:
        logger.error("Knowledge import failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/vectorstore")
async def clear_vectorstore(novel_path: str = Query(...)):
    try:
        from backend.novel_generator import clear_vector_store

        result = clear_vector_store(get_novel_dir(novel_path))
        return {"status": "success", "cleared": result}
    except Exception as e:
        logger.error("Vector store clear failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
