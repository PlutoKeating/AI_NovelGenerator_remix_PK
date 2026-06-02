"""Backend core utilities — shared paths, config store, logging, errors.

All other backend modules MUST import DATA_DIR / NOVELS_INDEX_PATH / CONFIG_PATH
from this package instead of constructing them locally. Single source of truth.
"""
from backend.core.paths import (
    DATA_DIR,
    CONFIG_PATH,
    NOVELS_INDEX_PATH,
    get_novel_dir,
    novel_file,
)
from backend.core.config_store import ConfigStore, config_store

__all__ = [
    "DATA_DIR",
    "CONFIG_PATH",
    "NOVELS_INDEX_PATH",
    "get_novel_dir",
    "novel_file",
    "ConfigStore",
    "config_store",
]
