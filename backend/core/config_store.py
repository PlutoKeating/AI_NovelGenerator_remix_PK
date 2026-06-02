"""Atomic, thread-safe, hot-reloading JSON config store.

Replaces the ad-hoc ``load_config_file`` / ``save_config_file`` helpers in
``backend.main`` and the duplicated mtime cache in ``backend.llm_service``.

Guarantees
----------
* **Atomic writes** — a temp file is fsynced and renamed onto the target so a
  crashed write never produces a partially-written ``config.json``.
* **Single-writer lock** — concurrent ``save()`` calls do not interleave.
* **mtime hot-reload** — readers detect external edits (e.g. user editing the
  file directly, WebDAV restore, or another process) without a restart.
* **Legacy migration** — flat ``llm_configs`` are upgraded to the hierarchical
  ``providers`` format on first read.
* **Proxy side-effects** — ``apply_proxy_settings`` is invoked on every
  successful read and write so HTTP_PROXY env vars stay in sync with config.
"""
from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from backend.core.paths import CONFIG_PATH

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Proxy side-effects
# ---------------------------------------------------------------------------

_PROXY_ENV_VARS = ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy")


def apply_proxy_settings(config: Dict[str, Any]) -> None:
    """Apply or clear HTTP(S)_PROXY env vars based on ``proxy_setting`` block."""
    try:
        proxy = config.get("proxy_setting") or {}
        enabled = bool(proxy.get("enabled", False))
        proxy_url = str(proxy.get("proxy_url", "")).strip()
        proxy_port = proxy.get("proxy_port", "")
        proxy_port = str(proxy_port).strip() if proxy_port not in (None, "") else ""

        if enabled and proxy_url:
            if "://" in proxy_url:
                full = proxy_url
                host_part = proxy_url.split("://", 1)[1]
                if proxy_port and ":" not in host_part:
                    full = f"{proxy_url}:{proxy_port}"
            else:
                full = f"http://{proxy_url}"
                if proxy_port:
                    full = f"{full}:{proxy_port}"
            for var in _PROXY_ENV_VARS:
                os.environ[var] = full
            logger.info("Applied proxy: %s", full)
        else:
            for var in _PROXY_ENV_VARS:
                os.environ.pop(var, None)
    except Exception:  # never crash on bad proxy config
        logger.exception("apply_proxy_settings failed")


# ---------------------------------------------------------------------------
# Legacy migration
# ---------------------------------------------------------------------------

def _migrate_legacy(config: Dict[str, Any]) -> Dict[str, Any]:
    """Convert flat ``llm_configs`` map into hierarchical ``providers`` list.

    Idempotent: existing ``providers`` are preserved untouched.
    """
    if config.get("providers"):
        return config
    legacy = config.get("llm_configs") or {}
    if not legacy:
        return config

    providers = []
    for name, cfg in legacy.items():
        providers.append(
            {
                "provider_name": name,
                "interface_format": cfg.get("interface_format", "OpenAI"),
                "base_url": cfg.get("base_url", ""),
                "timeout": cfg.get("timeout", 600),
                "keys": [
                    {
                        "api_key": cfg.get("api_key", ""),
                        "models": [
                            {
                                "model_name": cfg.get("model_name", ""),
                                "temperature": cfg.get("temperature", 0.7),
                                "max_tokens": cfg.get("max_tokens", 4096),
                            }
                        ],
                    }
                ],
                "models": [
                    {
                        "model_name": cfg.get("model_name", ""),
                        "temperature": cfg.get("temperature", 0.7),
                        "max_tokens": cfg.get("max_tokens", 4096),
                    }
                ],
            }
        )
    config["providers"] = providers
    logger.info("Migrated %d legacy llm_configs into providers", len(providers))
    return config


# ---------------------------------------------------------------------------
# Default factory
# ---------------------------------------------------------------------------

def _default_config() -> Dict[str, Any]:
    return {
        "last_interface_format": "OpenAI",
        "last_embedding_interface_format": "OpenAI",
        "providers": [],
        "llm_configs": {},
        "embedding_configs": {},
        "other_params": {
            "topic": "",
            "genre": "",
            "filepath": "",
            "num_chapters": 10,
            "word_number": 3000,
            "chapter_num": "1",
            "user_guidance": "",
            "characters_involved": "",
            "key_items": "",
            "scene_location": "",
            "time_constraint": "",
        },
        "choose_configs": {
            "prompt_draft_llm": "default",
            "chapter_outline_llm": "default",
            "architecture_llm": "default",
            "final_chapter_llm": "default",
            "consistency_review_llm": "default",
        },
        "proxy_setting": {"proxy_url": "", "proxy_port": "", "enabled": False},
        "webdav_config": {"webdav_url": "", "webdav_username": "", "webdav_password": ""},
    }


# ---------------------------------------------------------------------------
# ConfigStore
# ---------------------------------------------------------------------------

class ConfigStore:
    """Thread-safe singleton-style JSON config store with mtime hot-reload."""

    def __init__(self, path: Path | str = CONFIG_PATH) -> None:
        self._path: Path = Path(path)
        self._lock = threading.RLock()
        self._cache: Dict[str, Any] = {}
        self._mtime: float = -1.0

    @property
    def path(self) -> Path:
        return self._path

    # --- read ----------------------------------------------------------------

    def load(self, force: bool = False) -> Dict[str, Any]:
        """Return the current config, hot-reloading if the file changed on disk."""
        with self._lock:
            try:
                current_mtime = self._path.stat().st_mtime if self._path.exists() else -1.0
            except OSError:
                current_mtime = -1.0

            if not force and self._cache and current_mtime == self._mtime:
                return self._cache

            if not self._path.exists():
                cfg = _default_config()
                self._cache = cfg
                self._mtime = -1.0
                apply_proxy_settings(cfg)
                return cfg

            try:
                with self._path.open("r", encoding="utf-8") as f:
                    cfg = json.load(f)
            except Exception:
                logger.exception("Failed reading %s; falling back to defaults", self._path)
                cfg = _default_config()

            cfg = _migrate_legacy(cfg)
            apply_proxy_settings(cfg)
            self._cache = cfg
            self._mtime = current_mtime
            return cfg

    # --- write ---------------------------------------------------------------

    def save(self, config: Dict[str, Any]) -> None:
        """Atomically persist ``config`` to disk and update cache."""
        with self._lock:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            apply_proxy_settings(config)
            data = json.dumps(config, ensure_ascii=False, indent=2)
            fd, tmp_name = tempfile.mkstemp(
                prefix=".config.", suffix=".tmp", dir=str(self._path.parent)
            )
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    f.write(data)
                    f.flush()
                    try:
                        os.fsync(f.fileno())
                    except OSError:
                        pass  # best-effort on platforms without fsync
                os.replace(tmp_name, self._path)
            except Exception:
                if os.path.exists(tmp_name):
                    try:
                        os.unlink(tmp_name)
                    except OSError:
                        pass
                raise
            self._cache = config
            try:
                self._mtime = self._path.stat().st_mtime
            except OSError:
                self._mtime = -1.0

    def update(self, mutator: Callable[[Dict[str, Any]], Optional[Dict[str, Any]]]) -> Dict[str, Any]:
        """Apply ``mutator`` under the lock and persist. Returns the new config.

        ``mutator`` receives a mutable copy and may mutate in place or return a
        new dict.
        """
        with self._lock:
            current = json.loads(json.dumps(self.load()))  # deep copy
            updated = mutator(current)
            new_cfg = updated if isinstance(updated, dict) else current
            self.save(new_cfg)
            return new_cfg


# Process-wide singleton — module import side-effect is intentional and matches
# the previous behaviour of ``LLMService._instance``.
config_store = ConfigStore()
