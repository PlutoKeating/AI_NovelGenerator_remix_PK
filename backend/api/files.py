"""Generic novel file read/write + chapter file endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse

from backend.schemas.novel import FileRequest
from backend.services.novel_service import read_novel_file, write_novel_file

router = APIRouter(prefix="/api/files", tags=["files"])

# Friendly aliases mapped to on-disk names. Unknown names are passed through verbatim.
FILE_NAME_MAP = {
    "architecture": "Novel_architecture.txt",
    "blueprint": "Novel_directory.txt",
    "character_state": "character_state.txt",
    "global_summary": "global_summary.txt",
    "style": "style.txt",
    "knowledge_base": "knowledge_base.txt",
    "plot_arcs": "plot_arcs.txt",
}


@router.get("/{name}", response_class=PlainTextResponse)
async def get_file(name: str, novel_path: str = Query(...)):
    return read_novel_file(novel_path, FILE_NAME_MAP.get(name, name))


@router.put("/{name}")
async def put_file(name: str, req: FileRequest):
    write_novel_file(req.novel_path, FILE_NAME_MAP.get(name, name), req.content)
    return {"status": "success"}


@router.get("/chapters/{num}", response_class=PlainTextResponse)
async def get_chapter(num: str, novel_path: str = Query(...)):
    return read_novel_file(novel_path, f"chapter_{num}.txt")


@router.put("/chapters/{num}")
async def put_chapter(num: str, req: FileRequest):
    write_novel_file(req.novel_path, f"chapter_{num}.txt", req.content)
    return {"status": "success"}
