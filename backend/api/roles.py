"""Role library endpoints."""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, HTTPException, Query

from backend.schemas.role import (
    CategoryCreateRequest,
    RoleAnalyzeRequest,
    RoleCategory,
    RoleCreateRequest,
)
from backend.services.role_service import (
    analyze_text_for_roles,
    delete_role as svc_delete_role,
    ensure_category,
    load_roles,
    upsert_role,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("", response_model=List[RoleCategory])
async def get_roles(novel_path: str = Query(...)):
    return load_roles(novel_path)


@router.post("")
async def create_role(req: RoleCreateRequest):
    upsert_role(req.novel_path, req.category, req.role)
    return {"status": "success"}


@router.delete("")
async def delete_role(
    novel_path: str = Query(...),
    category: str = Query(...),
    role_name: str = Query(...),
):
    svc_delete_role(novel_path, category, role_name)
    return {"status": "success"}


@router.post("/category")
async def create_category(req: CategoryCreateRequest):
    ensure_category(req.novel_path, req.category)
    return {"status": "success"}


@router.post("/analyze")
async def analyze_roles(req: RoleAnalyzeRequest):
    try:
        count = analyze_text_for_roles(req.novel_path, req.text)
        return {"status": "success", "count": count}
    except Exception as e:
        logger.error("Role analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
