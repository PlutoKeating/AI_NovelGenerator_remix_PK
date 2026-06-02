"""Blueprint parser endpoint."""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Query

from backend.services.novel_service import parse_blueprint, read_novel_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["blueprint"])


@router.get("/blueprint", response_model=List[dict])
async def get_blueprint(novel_path: str = Query(...)):
    try:
        return parse_blueprint(read_novel_file(novel_path, "Novel_directory.txt"))
    except Exception as e:
        logger.error("Blueprint parse failed: %s", e)
        return []
