"""Phase 1 regression tests.

Pinning the three BUG fixes + the new core foundations.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# core.paths — single DATA_DIR source
# ---------------------------------------------------------------------------

def test_paths_single_source():
    from backend.core.paths import DATA_DIR, CONFIG_PATH, NOVELS_INDEX_PATH

    assert DATA_DIR.exists() and DATA_DIR.is_dir()
    assert str(CONFIG_PATH).startswith(str(DATA_DIR))
    assert str(NOVELS_INDEX_PATH).startswith(str(DATA_DIR))


def test_llm_tools_uses_same_data_dir():
    """BUG 1 regression: ``llm_tools`` no longer hard-codes its own DATA_DIR."""
    from backend.core.paths import DATA_DIR
    from backend import llm_tools

    assert Path(llm_tools.DATA_DIR).resolve() == DATA_DIR.resolve()
    assert Path(llm_tools.get_novel_dir("foo")).resolve() == (DATA_DIR / "foo").resolve()


# ---------------------------------------------------------------------------
# core.config_store — atomic writes + hot reload
# ---------------------------------------------------------------------------

def test_config_store_atomic_save_and_reload(tmp_path: Path):
    from backend.core.config_store import ConfigStore

    cfg_path = tmp_path / "config.json"
    store = ConfigStore(cfg_path)
    store.save({"providers": [{"provider_name": "p1"}]})

    # File contents are valid JSON (no half-written state).
    raw = json.loads(cfg_path.read_text(encoding="utf-8"))
    assert raw["providers"][0]["provider_name"] == "p1"

    # External edit -> next load() returns it.
    cfg_path.write_text(json.dumps({"providers": [{"provider_name": "p2"}]}), encoding="utf-8")
    # bump mtime forward to ensure hot-reload triggers even on coarse FS clocks
    new_time = cfg_path.stat().st_mtime + 5
    os.utime(cfg_path, (new_time, new_time))
    assert store.load()["providers"][0]["provider_name"] == "p2"


def test_config_store_legacy_migration(tmp_path: Path):
    from backend.core.config_store import ConfigStore

    cfg_path = tmp_path / "config.json"
    cfg_path.write_text(
        json.dumps(
            {
                "llm_configs": {
                    "openai-default": {
                        "interface_format": "OpenAI",
                        "base_url": "https://api.openai.com/v1",
                        "api_key": "sk-x",
                        "model_name": "gpt-4o",
                        "temperature": 0.5,
                        "max_tokens": 2048,
                    }
                }
            }
        ),
        encoding="utf-8",
    )
    store = ConfigStore(cfg_path)
    cfg = store.load()
    assert len(cfg["providers"]) == 1
    assert cfg["providers"][0]["provider_name"] == "openai-default"
    assert cfg["providers"][0]["keys"][0]["api_key"] == "sk-x"


# ---------------------------------------------------------------------------
# Agent loop — system prompt is injected exactly once
# ---------------------------------------------------------------------------

def test_agent_loop_system_prompt_no_accumulation():
    """BUG 2 regression: SYSTEM_TOOL_INSTRUCTIONS must not be appended on every run."""
    from backend.agent_loop import AgentLoop, SYSTEM_TOOL_INSTRUCTIONS

    agent = AgentLoop(novel_id="testnovel", max_steps=0)

    history = [{"role": "user", "content": "hi"}]
    # Drive the generator just enough to execute the injection block.
    gen = agent.run(history)
    next(gen)  # first yielded status message
    # Force the generator to terminate without any LLM call.
    try:
        gen.close()
    except Exception:
        pass

    # Now run a second time on a history that already contains the system msg.
    persisted_history = [
        {"role": "system", "content": SYSTEM_TOOL_INSTRUCTIONS + "\n\nuser-extra"},
        {"role": "user", "content": "again"},
    ]
    gen2 = agent.run(persisted_history)
    next(gen2)
    try:
        gen2.close()
    except Exception:
        pass

    # The sentinel must appear exactly once even if we ran twice.
    sentinel = "# LLM Function Calling & Tool Use Guide"
    assert persisted_history[0]["content"].count(sentinel) == 1


# ---------------------------------------------------------------------------
# Embedding resolver — providers fallback (BUG 3)
# ---------------------------------------------------------------------------

def test_embedding_resolver_falls_back_to_providers(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """BUG 3 regression: when ``embedding_configs`` is empty but ``providers``
    are configured, the embedding resolver must surface the provider creds
    instead of returning blanks."""
    from backend.core.config_store import config_store

    config_store.save(
        {
            "providers": [
                {
                    "provider_name": "openai",
                    "interface_format": "OpenAI",
                    "base_url": "https://api.openai.com/v1",
                    "timeout": 600,
                    "keys": [{"api_key": "sk-test"}],
                    "models": [{"model_name": "text-embedding-3-large"}],
                }
            ],
            "embedding_configs": {},
        }
    )

    from backend import main as backend_main

    class Req:
        embedding_config_name = "default"

    params = backend_main._get_embedding_params_from_request(Req())
    assert params["embedding_api_key"] == "sk-test"
    assert params["embedding_url"] == "https://api.openai.com/v1"
    assert params["embedding_model_name"] == "text-embedding-3-large"
    assert params["embedding_interface_format"] == "OpenAI"
