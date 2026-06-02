"""Novels CRUD + per-novel info."""
from __future__ import annotations

import logging
import os
import shutil
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException

from backend.schemas.novel import (
    NovelCreateRequest,
    NovelInfoUpdateRequest,
    NovelMetadata,
    NovelUpdateRequest,
)
from backend.services.novel_service import (
    create_novel_dir,
    get_novel_by_id,
    get_novel_dir,
    load_novels_index,
    read_novel_file,
    save_novels_index,
    update_novel_word_count,
    write_novel_file,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/novels", tags=["novels"])


@router.get("", response_model=List[NovelMetadata])
async def list_novels():
    index = load_novels_index()
    for novel in index:
        update_novel_word_count(novel)
    save_novels_index(index)
    return [NovelMetadata(**n) for n in index]


@router.post("", response_model=NovelMetadata)
async def create_novel(req: NovelCreateRequest):
    novel_id = uuid.uuid4().hex[:8] + "_" + req.title.replace(" ", "_")[:30]
    now = datetime.now().isoformat()
    novel = NovelMetadata(
        id=novel_id,
        title=req.title,
        genre=req.genre,
        num_chapters=req.num_chapters,
        description=req.description,
        created_at=now,
        updated_at=now,
    )
    create_novel_dir(novel_id)
    index = load_novels_index()
    index.append(novel.model_dump())
    save_novels_index(index)
    return novel


@router.get("/{novel_id}", response_model=NovelMetadata)
async def get_novel(novel_id: str):
    novel = get_novel_by_id(novel_id)
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    update_novel_word_count(novel)
    return NovelMetadata(**novel)


@router.put("/{novel_id}", response_model=NovelMetadata)
async def update_novel(novel_id: str, req: NovelUpdateRequest):
    index = load_novels_index()
    for novel in index:
        if novel.get("id") != novel_id:
            continue
        for field in ("title", "genre", "num_chapters", "description", "background", "characters", "status"):
            value = getattr(req, field, None)
            if value is not None:
                novel[field] = value
        novel["updated_at"] = datetime.now().isoformat()
        save_novels_index(index)
        return NovelMetadata(**novel)
    raise HTTPException(status_code=404, detail="Novel not found")


@router.delete("/{novel_id}")
async def delete_novel(novel_id: str):
    index = load_novels_index()
    novel = get_novel_by_id(novel_id)
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    save_novels_index([n for n in index if n.get("id") != novel_id])
    novel_dir = get_novel_dir(novel_id)
    if os.path.exists(novel_dir):
        shutil.rmtree(novel_dir)
    return {"status": "success"}


@router.post("/{novel_id}/info")
async def update_novel_info(novel_id: str, req: NovelInfoUpdateRequest):
    novel = get_novel_by_id(novel_id)
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if req.background:
        write_novel_file(novel_id, "background.txt", req.background)
    if req.characters:
        write_novel_file(novel_id, "characters.txt", req.characters)
    index = load_novels_index()
    for n in index:
        if n.get("id") == novel_id:
            n["background"] = req.background
            n["characters"] = req.characters
            n["updated_at"] = datetime.now().isoformat()
            break
    save_novels_index(index)
    return {"status": "success"}


@router.get("/{novel_id}/info")
async def get_novel_info(novel_id: str):
    novel = get_novel_by_id(novel_id)
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    return {
        "background": read_novel_file(novel_id, "background.txt") or novel.get("background", ""),
        "characters": read_novel_file(novel_id, "characters.txt") or novel.get("characters", ""),
        "user_guidance": read_novel_file(novel_id, "user_guidance.txt"),
        "key_items": read_novel_file(novel_id, "key_items.txt"),
        "scene_location": read_novel_file(novel_id, "scene_location.txt"),
        "time_constraint": read_novel_file(novel_id, "time_constraint.txt"),
    }
