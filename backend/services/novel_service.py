"""Novel filesystem + index helpers.

Single home for the file/index helpers that previously lived in
``backend.main``. All path resolution funnels through ``backend.core.paths``.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import List, Optional

from backend.core.paths import DATA_DIR, NOVELS_INDEX_PATH, get_novel_dir as _core_novel_dir
from backend.schemas.novel import ChapterInfo

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def get_novel_dir(novel_path: str) -> str:
    """Resolve a novel directory from id or absolute path."""
    return str(_core_novel_dir(novel_path))


def read_novel_file(novel_path: str, filename: str) -> str:
    """Read a UTF-8 file from a novel's directory; missing -> empty string."""
    fp = os.path.join(get_novel_dir(novel_path), filename)
    if not os.path.exists(fp):
        return ""
    with open(fp, "r", encoding="utf-8") as f:
        return f.read()


def write_novel_file(novel_path: str, filename: str, content: str) -> None:
    """Write UTF-8 content to a novel's file, creating the directory if needed."""
    novel_dir = get_novel_dir(novel_path)
    os.makedirs(novel_dir, exist_ok=True)
    with open(os.path.join(novel_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)


def get_word_count(text: str) -> int:
    """Count Chinese characters + English words for mixed-language manuscripts."""
    if not text:
        return 0
    chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
    english = sum(1 for w in text.split() if w.strip() and any(c.isalpha() for c in w))
    return chinese + english


def list_chapters(novel_path: str) -> List[ChapterInfo]:
    """Return ordered chapter metadata derived from ``chapter_*.txt`` files."""
    novel_dir = get_novel_dir(novel_path)
    if not os.path.exists(novel_dir):
        return []
    out: List[ChapterInfo] = []
    for fname in sorted(os.listdir(novel_dir)):
        if not (fname.startswith("chapter_") and fname.endswith(".txt")):
            continue
        num = fname[len("chapter_"):-len(".txt")]
        with open(os.path.join(novel_dir, fname), "r", encoding="utf-8") as f:
            content = f.read()
        title = content.strip().split("\n", 1)[0][:50] if content.strip() else "Untitled"
        out.append(ChapterInfo(number=num, title=title, wordCount=get_word_count(content)))
    return out


# ---------------------------------------------------------------------------
# Novels index
# ---------------------------------------------------------------------------

def load_novels_index() -> List[dict]:
    if not os.path.exists(NOVELS_INDEX_PATH):
        return []
    try:
        with open(NOVELS_INDEX_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        logger.exception("Failed reading novels index; returning empty")
        return []


def save_novels_index(index: List[dict]) -> None:
    NOVELS_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(NOVELS_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def get_novel_by_id(novel_id: str) -> Optional[dict]:
    return next((n for n in load_novels_index() if n.get("id") == novel_id), None)


def update_novel_word_count(novel: dict) -> None:
    novel_dir = get_novel_dir(novel["id"])
    total = 0
    if os.path.exists(novel_dir):
        for fname in os.listdir(novel_dir):
            if fname.startswith("chapter_") and fname.endswith(".txt"):
                with open(os.path.join(novel_dir, fname), "r", encoding="utf-8") as f:
                    total += get_word_count(f.read())
    novel["word_count"] = total
    novel["updated_at"] = datetime.now().isoformat()


def create_novel_dir(novel_id: str) -> str:
    novel_dir = os.path.join(str(DATA_DIR), novel_id)
    os.makedirs(novel_dir, exist_ok=True)
    os.makedirs(os.path.join(novel_dir, "chapters"), exist_ok=True)
    return novel_dir


# ---------------------------------------------------------------------------
# Blueprint parser (extracted from main.get_blueprint)
# ---------------------------------------------------------------------------

def parse_blueprint(content: str) -> List[dict]:
    """Lightweight parser used by ``GET /api/blueprint``.

    The richer canonical parser lives in
    ``backend.chapter_directory_parser.parse_chapter_blueprint``; this version
    preserves the legacy field names expected by the frontend.
    """
    import re

    chapters: List[dict] = []
    current: dict = {}

    def _split_value(line: str) -> str:
        if "：" in line:
            return line.split("：", 1)[1].strip()
        if ":" in line:
            return line.split(":", 1)[1].strip()
        return ""

    for raw in (content or "").splitlines():
        line = raw.strip()
        if not line:
            if current and "number" in current:
                chapters.append(current)
                current = {}
            continue
        if line.startswith("第") and ("章" in line or "Chapter" in line):
            m = re.search(r"第\s*(\d+)\s*章", line) or re.search(r"Chapter\s*(\d+)", line, re.I)
            if m:
                current["number"] = m.group(1)
            current["title"] = _split_value(line) or line
        elif line.startswith(("章节角色", "Chapter Role")):
            current["role"] = _split_value(line)
        elif line.startswith(("章节目的", "Chapter Purpose")):
            current["purpose"] = _split_value(line)
        elif line.startswith(("悬念等级", "Suspense Level")):
            current["suspenseLevel"] = _split_value(line)
        elif line.startswith(("伏笔", "Foreshadowing")):
            current["foreshadowing"] = _split_value(line)
        elif line.startswith(("反转等级", "Plot Twist Level")):
            current["plotTwistLevel"] = _split_value(line)
        elif line.startswith(("章节摘要", "Chapter Summary")):
            current["summary"] = _split_value(line)
    if current and "number" in current:
        chapters.append(current)
    return chapters
