"""LLM / embedding parameter resolution for the generation routes.

Encapsulates the "from request -> kwargs for pipeline functions" contract so
the routers stay declarative.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.core.config_store import config_store
from backend.llm_service import LLMService


def get_llm_params_from_request(req: Any) -> Dict[str, Any]:
    """Resolve LLM call params via the canonical LLMService config selector."""
    service = LLMService()
    selector_raw = getattr(req, "llm_config_name", None)
    selector = selector_raw if selector_raw and selector_raw != "default" else None
    cfg = service.resolve_llm_config(selector)
    return {
        "interface_format": cfg.interface_format,
        "api_key": cfg.api_key,
        "base_url": cfg.base_url,
        "llm_model": cfg.model_name,
        "temperature": cfg.temperature,
        "max_tokens": cfg.max_tokens,
        "timeout": cfg.timeout,
    }


def get_embedding_params_from_request(req: Any) -> Dict[str, Any]:
    """Resolve embedding params with full new-providers + legacy fallback chain.

    Resolution order:
      1. ``embedding_configs[req.embedding_config_name]`` — explicit legacy.
      2. ``providers`` matching ``provider/model[@key_idx]`` selector.
      3. First non-empty ``embedding_configs`` entry.
      4. Empty params — callers must tolerate (vector ops are best-effort).
    """
    config = config_store.load()
    emb_name_raw = getattr(req, "embedding_config_name", None)
    emb_name = emb_name_raw if emb_name_raw else "default"

    legacy_map = config.get("embedding_configs", {}) or {}
    emb_cfg = legacy_map.get(emb_name) or {}

    if not emb_cfg.get("api_key") and not emb_cfg.get("base_url"):
        providers = config.get("providers", []) or []
        target_provider = None
        target_model = None
        target_key_idx = 0

        if emb_name and emb_name != "default":
            sel = emb_name
            if "@" in sel:
                sel, idx = sel.rsplit("@", 1)
                try:
                    target_key_idx = int(idx)
                except ValueError:
                    target_key_idx = 0
            pname, mname = (sel.split("/", 1) + [""])[:2] if "/" in sel else (sel, "")
            target_provider = next((p for p in providers if p.get("provider_name") == pname), None)
            if target_provider and mname:
                target_model = next(
                    (m for m in target_provider.get("models", []) if m.get("model_name") == mname),
                    None,
                )
        if target_provider is None and providers:
            target_provider = providers[0]
        if target_provider is not None:
            keys = target_provider.get("keys", []) or []
            models = target_provider.get("models", []) or []
            key_obj = (
                keys[target_key_idx]
                if 0 <= target_key_idx < len(keys)
                else (keys[0] if keys else {})
            )
            model_obj = target_model or (models[0] if models else {})
            emb_cfg = {
                "api_key": key_obj.get("api_key", ""),
                "base_url": target_provider.get("base_url", ""),
                "interface_format": target_provider.get("interface_format", "OpenAI"),
                "model_name": model_obj.get("model_name", ""),
                "retrieval_k": 4,
            }

    if not emb_cfg.get("api_key") and not emb_cfg.get("base_url") and legacy_map:
        emb_cfg = next(
            (v for v in legacy_map.values() if v.get("api_key") or v.get("base_url")),
            {},
        )

    return {
        "embedding_api_key": emb_cfg.get("api_key", ""),
        "embedding_url": emb_cfg.get("base_url", ""),
        "embedding_interface_format": emb_cfg.get("interface_format", "OpenAI"),
        "embedding_model_name": emb_cfg.get("model_name", ""),
        "embedding_retrieval_k": int(emb_cfg.get("retrieval_k", 4) or 4),
    }
