"""Chapter listing endpoint."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Query

from backend.schemas.novel import ChapterInfo
from backend.services.novel_service import list_chapters

router = APIRouter(prefix="/api", tags=["chapters"])


@router.get("/chapters", response_model=List[ChapterInfo])
async def list_chapters_endpoint(novel_path: str = Query(...)):
    return list_chapters(novel_path)
