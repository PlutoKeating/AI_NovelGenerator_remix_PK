"""Role-library persistence."""
from __future__ import annotations

import json
import os
import re
from typing import List

from backend.schemas.role import RoleCategory, RoleData
from backend.services.novel_service import get_novel_dir


def _roles_path(novel_path: str) -> str:
    return os.path.join(get_novel_dir(novel_path), "roles.json")


def load_roles(novel_path: str) -> List[RoleCategory]:
    fp = _roles_path(novel_path)
    if not os.path.exists(fp):
        return []
    with open(fp, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [RoleCategory(**cat) for cat in data]


def save_roles(novel_path: str, categories: List[RoleCategory]) -> None:
    novel_dir = get_novel_dir(novel_path)
    os.makedirs(novel_dir, exist_ok=True)
    with open(_roles_path(novel_path), "w", encoding="utf-8") as f:
        json.dump([c.model_dump() for c in categories], f, ensure_ascii=False, indent=2)


def upsert_role(novel_path: str, category_name: str, role: RoleData) -> None:
    categories = load_roles(novel_path)
    cat = next((c for c in categories if c.name == category_name), None)
    if cat is None:
        cat = RoleCategory(name=category_name, roles=[])
        categories.append(cat)
    if any(r.name == role.name for r in cat.roles):
        cat.roles = [r if r.name != role.name else role for r in cat.roles]
    else:
        cat.roles.append(role)
    save_roles(novel_path, categories)


def delete_role(novel_path: str, category_name: str, role_name: str) -> None:
    categories = load_roles(novel_path)
    cat = next((c for c in categories if c.name == category_name), None)
    if not cat:
        return
    cat.roles = [r for r in cat.roles if r.name != role_name]
    if not cat.roles:
        categories = [c for c in categories if c.name != category_name]
    save_roles(novel_path, categories)


def ensure_category(novel_path: str, category_name: str) -> None:
    categories = load_roles(novel_path)
    if not any(c.name == category_name for c in categories):
        categories.append(RoleCategory(name=category_name, roles=[]))
        save_roles(novel_path, categories)


_NAME_PATTERN = re.compile(r"[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*")


def analyze_text_for_roles(novel_path: str, text: str, category_name: str = "Auto Detected") -> int:
    """Heuristic role detection — extract capitalized name-shaped tokens.

    Note: this is intentionally simple. A future revision should plug in an LLM
    call for Chinese / mixed text and dedup against existing roles by alias.
    """
    raw = list({n for n in _NAME_PATTERN.findall(text) if len(n) > 2})[:20]
    categories = load_roles(novel_path)
    auto = next((c for c in categories if c.name == category_name), None)
    if auto is None:
        auto = RoleCategory(name=category_name, roles=[])
        categories.append(auto)
    for name in raw:
        if not any(r.name == name for r in auto.roles):
            auto.roles.append(RoleData(name=name, description="Auto-detected from text"))
    save_roles(novel_path, categories)
    return len(raw)
