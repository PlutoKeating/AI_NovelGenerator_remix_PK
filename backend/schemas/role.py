"""Role library schemas."""
from __future__ import annotations

from typing import List

from pydantic import BaseModel


class RoleData(BaseModel):
    name: str
    description: str = ""
    character_arc: str = ""
    relationships: str = ""


class RoleCategory(BaseModel):
    name: str
    roles: List[RoleData]


class RoleCreateRequest(BaseModel):
    novel_path: str
    category: str
    role: RoleData


class CategoryCreateRequest(BaseModel):
    novel_path: str
    category: str


class RoleAnalyzeRequest(BaseModel):
    novel_path: str
    text: str
