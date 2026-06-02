"""Novel metadata + file I/O schemas."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class NovelMetadata(BaseModel):
    id: str
    title: str
    genre: str = ""
    num_chapters: int = 10
    word_count: int = 0
    created_at: str = ""
    updated_at: str = ""
    cover_path: Optional[str] = None
    status: str = "draft"
    description: str = ""
    background: str = ""
    characters: str = ""


class NovelCreateRequest(BaseModel):
    title: str
    genre: str = ""
    num_chapters: int = 10
    description: str = ""


class NovelUpdateRequest(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    num_chapters: Optional[int] = None
    description: Optional[str] = None
    background: Optional[str] = None
    characters: Optional[str] = None
    status: Optional[str] = None


class NovelInfoUpdateRequest(BaseModel):
    background: str = ""
    characters: str = ""
    user_guidance: str = ""
    key_items: str = ""
    scene_location: str = ""
    time_constraint: str = ""


class ChapterInfo(BaseModel):
    number: str
    title: str
    wordCount: int


class FileRequest(BaseModel):
    novel_path: str
    content: str
