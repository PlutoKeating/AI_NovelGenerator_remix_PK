"""WebDAV remote-config helpers.

Note: this is intentionally minimal — single-file ``config.json`` only — and
mirrors the original ``backend.main`` behaviour. A more complete WebDAV sync
(novels + chapters + conflict detection) will land in a later phase.
"""
from __future__ import annotations

import json
from typing import Any, Dict, Tuple

import requests

from backend.core.config_store import config_store


def _build_target(cfg: Dict[str, Any], file_name: str = "config.json") -> Tuple[str, Tuple[str, str]]:
    url = (
        cfg.get("url", "").rstrip("/")
        + "/"
        + cfg.get("remote_path", "").lstrip("/")
        + file_name
    )
    auth = (cfg.get("username", ""), cfg.get("password", ""))
    return url, auth


def test_connection(cfg: Dict[str, Any]) -> int:
    url = cfg.get("url", "")
    auth = (cfg.get("username", ""), cfg.get("password", ""))
    response = requests.request("PROPFIND", url, auth=auth, timeout=10)
    return response.status_code


def backup_config(cfg: Dict[str, Any]) -> int:
    url, auth = _build_target(cfg)
    payload = json.dumps(config_store.load(), ensure_ascii=False)
    response = requests.put(url, auth=auth, data=payload.encode("utf-8"), timeout=30)
    return response.status_code


def restore_config(cfg: Dict[str, Any]) -> int:
    url, auth = _build_target(cfg)
    response = requests.get(url, auth=auth, timeout=30)
    if response.status_code == 200:
        config_store.save(response.json())
    return response.status_code
