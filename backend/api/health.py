"""Health-check endpoint."""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-novel-generator"}
