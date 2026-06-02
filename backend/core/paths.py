"""Single source of truth for filesystem paths.

Historically `backend/main.py` and `backend/llm_tools.py` independently computed
their own DATA_DIR (one used the env var, the other hard-coded
`os.path.dirname(__file__)/data`), which silently sent file writes to two
different directories and caused the agent tools to mutate a different
filesystem than the API layer.

All code MUST import DATA_DIR from here.
"""
from __future__ import annotations

import os
from pathlib import Path


def _resolve_data_dir() -> Path:
    """Resolve DATA_DIR honoring the DATA_DIR env var, with project-root fallback.

    Resolution order:
        1. ``$DATA_DIR`` env var (absolute or relative to CWD).
        2. ``<repo_root>/data`` — repo root being the parent of the ``backend`` package.
    """
    env = os.getenv("DATA_DIR", "").strip()
    if env:
        path = Path(env).expanduser()
    else:
        # backend/core/paths.py -> backend/core -> backend -> repo root
        path = Path(__file__).resolve().parent.parent.parent / "data"
    path.mkdir(parents=True, exist_ok=True)
    return path


DATA_DIR: Path = _resolve_data_dir()
CONFIG_PATH: Path = DATA_DIR / "config.json"
NOVELS_INDEX_PATH: Path = DATA_DIR / "novels_index.json"


def get_novel_dir(novel_path: str | os.PathLike) -> Path:
    """Resolve a novel directory path. Accepts an absolute path or a novel id."""
    p = Path(novel_path)
    if p.is_absolute():
        return p
    return DATA_DIR / str(novel_path)


def novel_file(novel_path: str | os.PathLike, filename: str) -> Path:
    """Build a filesystem path for a file inside a novel directory."""
    return get_novel_dir(novel_path) / filename
